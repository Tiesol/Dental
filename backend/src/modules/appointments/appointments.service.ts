import { Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../common/errors/domain-error';
import { Clock } from '../../common/time/clock';
import { CurrentUserData } from '../../common/types/current-user';
import type { Tx } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentView, CuandoCitas } from './domain/appointment';
import {
  assertHorarioReservable,
  assertPuedeVerCita,
  filtrarPorCuando,
} from './domain/appointment-rules';
import { calcularHoraFin } from './domain/end-time';
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
  reservar(dto: CreateAppointmentDto, patientId: string): Promise<AppointmentView> {
    const horaInicio = new Date(dto.horaInicio);
    return this.appointments.withDentistLock(dto.dentistId, async (tx) => {
      const { duracionMin } = await this.availability.assertReservable(
        dto.dentistId,
        dto.serviceId,
        tx,
      );
      await this.assertDisponible(dto.dentistId, horaInicio, duracionMin, tx);
      return this.appointments.create(tx, {
        patientId,
        dentistId: dto.dentistId,
        serviceId: dto.serviceId,
        horaInicio,
        horaFin: calcularHoraFin(horaInicio, duracionMin),
      });
    });
  }

  async findMine(patientId: string, cuando?: CuandoCitas): Promise<AppointmentView[]> {
    const citas = await this.appointments.findByPatient(patientId);
    return filtrarPorCuando(citas, cuando, this.clock.now());
  }

  async findOne(id: string, user: CurrentUserData): Promise<AppointmentView> {
    const cita = await this.getOrThrow(id);
    assertPuedeVerCita(cita, user);
    return cita;
  }

  findAll(query: ListAppointmentsQuery): Promise<AppointmentView[]> {
    return this.appointments.findAll({
      rango: query.fecha ? this.availability.rangoDeFecha(query.fecha) : undefined,
      estado: query.estado,
      dentistId: query.dentistId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  private async assertDisponible(
    dentistId: string,
    horaInicio: Date,
    duracionMin: number,
    tx: Tx,
  ): Promise<void> {
    const slots = await this.availability.slotsDelDia({
      dentistId,
      fecha: this.availability.fechaClinica(horaInicio),
      duracionMin,
      tx,
    });
    assertHorarioReservable(horaInicio, slots, this.clock.now());
  }

  private async getOrThrow(id: string): Promise<AppointmentView> {
    const cita = await this.appointments.findById(id);
    if (!cita) {
      throw new RecursoNoEncontradoError('Cita');
    }
    return cita;
  }
}
