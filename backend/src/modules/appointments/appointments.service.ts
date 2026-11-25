import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../common/errors/domain-error';
import { Clock } from '../../common/time/clock';
import { CurrentUserData } from '../../common/types/current-user';
import type { Tx } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentStatus, AppointmentView, AppointmentWhen } from './domain/appointment';
import {
  assertAppointmentModifiable,
  assertSlotBookable,
  assertCanViewAppointment,
  filterByWhen,
} from './domain/appointment-rules';
import { assertCanFinish, assertTransitionAllowed } from './domain/appointment-status';
import { calculateEndTime } from './domain/end-time';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';

// Casos de uso de la cita.
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly availability: AvailabilityService,
    private readonly clock: Clock,
  ) {}

  // Todo dentro de la transacción con el odontólogo bloqueado: se vuelve a validar justo antes de
  // insertar, para resistir dos solicitudes casi simultáneas (PDF sección 6).
  book(dto: CreateAppointmentDto, patientId: string): Promise<AppointmentView> {
    const startsAt = new Date(dto.horaInicio);
    return this.appointments.withDentistLock(dto.dentistId, async (tx) => {
      const { duracionMin: durationMin } = await this.availability.assertBookable(
        dto.dentistId,
        dto.serviceId,
        tx,
      );
      await this.assertAvailable(dto.dentistId, startsAt, durationMin, tx);
      return this.appointments.create(tx, {
        patientId,
        dentistId: dto.dentistId,
        serviceId: dto.serviceId,
        horaInicio: startsAt,
        horaFin: calculateEndTime(startsAt, durationMin),
      });
    });
  }

  // Misma transacción y mismas validaciones que reservar. Se excluye la propia cita al calcular
  // los horarios libres, para poder moverla a uno que se cruza con el suyo. Conserva estado,
  // odontólogo y servicio (D4 de PLAN.md).
  async reschedule(id: string, newStart: string, user: CurrentUserData): Promise<AppointmentView> {
    const startsAt = new Date(newStart);
    return this.modifyAppointment(id, user, async (appointment, tx) => {
      const { duracionMin: durationMin } = await this.availability.assertBookable(
        appointment.odontologo.id,
        appointment.servicio.id,
        tx,
      );
      await this.assertAvailable(
        appointment.odontologo.id,
        startsAt,
        durationMin,
        tx,
        appointment.id,
      );
      return this.appointments.updateTimes(tx, appointment.id, {
        horaInicio: startsAt,
        horaFin: calculateEndTime(startsAt, durationMin),
      });
    });
  }

  // El horario queda libre de inmediato: una cita CANCELADA no ocupa la agenda.
  cancel(id: string, user: CurrentUserData): Promise<AppointmentView> {
    return this.modifyAppointment(id, user, (appointment, tx) =>
      this.appointments.updateStatus(tx, appointment.id, 'CANCELADA'),
    );
  }

  // Primero la propiedad (403), luego la transición. El estado y la observación se releen con el
  // odontólogo bloqueado, por si otra petición los cambió mientras esta esperaba.
  async changeStatus(
    id: string,
    to: AppointmentStatus,
    user: CurrentUserData,
  ): Promise<AppointmentView> {
    const { odontologo: dentist } = await this.findOne(id, user);
    return this.appointments.withDentistLock(dentist.id, async (tx) => {
      const appointment = await this.getOrThrow(id, tx);
      assertTransitionAllowed(appointment.estado, to, user.role);
      assertCanFinish(to, appointment.observacion);
      return this.appointments.updateStatus(tx, id, to);
    });
  }

  async findMine(patientId: string, when?: AppointmentWhen): Promise<AppointmentView[]> {
    const appointments = await this.appointments.findByPatient(patientId);
    return filterByWhen(appointments, when, this.clock.now());
  }

  async findOne(id: string, user: CurrentUserData): Promise<AppointmentView> {
    const appointment = await this.getOrThrow(id);
    assertCanViewAppointment(appointment, user);
    return appointment;
  }

  findAll(query: ListAppointmentsQuery): Promise<AppointmentView[]> {
    return this.appointments.findAll({
      range: query.fecha ? this.availability.dateRange(query.fecha) : undefined,
      estado: query.estado,
      dentistId: query.dentistId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // Reglas comunes a reprogramar y cancelar. El estado se relee con el odontólogo bloqueado, por
  // si otra petición cambió la cita mientras esta esperaba.
  private async modifyAppointment(
    id: string,
    user: CurrentUserData,
    change: (appointment: AppointmentView, tx: Tx) => Promise<AppointmentView>,
  ): Promise<AppointmentView> {
    const { odontologo: dentist } = await this.findOne(id, user);
    return this.appointments.withDentistLock(dentist.id, async (tx) => {
      const appointment = await this.getOrThrow(id, tx);
      assertAppointmentModifiable(appointment.estado);
      return change(appointment, tx);
    });
  }

  // Sin CANCELADA (D8 de PLAN.md). "Hoy" se calcula en la zona de la clínica.
  dayAgenda(dentistId: string, date?: string): Promise<AppointmentView[]> {
    const day = date ?? this.availability.clinicDate(this.clock.now());
    return this.appointments.findAgenda(dentistId, this.availability.dateRange(day));
  }

  upcomingForDentist(dentistId: string, limit: number): Promise<AppointmentView[]> {
    return this.appointments.findUpcoming(dentistId, this.clock.now(), limit);
  }

  private async assertAvailable(
    dentistId: string,
    startsAt: Date,
    durationMin: number,
    tx: Tx,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const slots = await this.availability.daySlots({
      dentistId,
      fecha: this.availability.clinicDate(startsAt),
      duracionMin: durationMin,
      tx,
      excludeAppointmentId,
    });
    assertSlotBookable(startsAt, slots, this.clock.now());
  }

  private async getOrThrow(id: string, tx?: Tx): Promise<AppointmentView> {
    const appointment = await this.appointments.findById(id, tx);
    if (!appointment) {
      throw new ResourceNotFoundError('Cita');
    }
    return appointment;
  }
}
