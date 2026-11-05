import { Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../common/errors/domain-error';
import { Clock } from '../../common/time/clock';
import { CurrentUserData } from '../../common/types/current-user';
import type { Tx } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentView, CuandoCitas } from './domain/appointment';
import {
  assertCitaModificable,
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

  // Misma transacción y mismas validaciones que reservar. Se excluye la propia cita al calcular
  // los horarios libres, para poder moverla a uno que se cruza con el suyo. Conserva estado,
  // odontólogo y servicio (D4 de PLAN.md).
  async reprogramar(
    id: string,
    nuevaHora: string,
    user: CurrentUserData,
  ): Promise<AppointmentView> {
    const horaInicio = new Date(nuevaHora);
    return this.modificar(id, user, async (cita, tx) => {
      const { duracionMin } = await this.availability.assertReservable(
        cita.odontologo.id,
        cita.servicio.id,
        tx,
      );
      await this.assertDisponible(cita.odontologo.id, horaInicio, duracionMin, tx, cita.id);
      return this.appointments.updateHorario(tx, cita.id, {
        horaInicio,
        horaFin: calcularHoraFin(horaInicio, duracionMin),
      });
    });
  }

  // El horario queda libre de inmediato: una cita CANCELADA no ocupa la agenda.
  cancelar(id: string, user: CurrentUserData): Promise<AppointmentView> {
    return this.modificar(id, user, (cita, tx) =>
      this.appointments.updateEstado(tx, cita.id, 'CANCELADA'),
    );
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

  // Reglas comunes a reprogramar y cancelar. El estado se relee con el odontólogo bloqueado, por
  // si otra petición cambió la cita mientras esta esperaba.
  private async modificar(
    id: string,
    user: CurrentUserData,
    cambio: (cita: AppointmentView, tx: Tx) => Promise<AppointmentView>,
  ): Promise<AppointmentView> {
    const { odontologo } = await this.findOne(id, user);
    return this.appointments.withDentistLock(odontologo.id, async (tx) => {
      const cita = await this.getOrThrow(id, tx);
      assertCitaModificable(cita.estado);
      return cambio(cita, tx);
    });
  }

  private async assertDisponible(
    dentistId: string,
    horaInicio: Date,
    duracionMin: number,
    tx: Tx,
    excluirCitaId?: string,
  ): Promise<void> {
    const slots = await this.availability.slotsDelDia({
      dentistId,
      fecha: this.availability.fechaClinica(horaInicio),
      duracionMin,
      tx,
      excluirCitaId,
    });
    assertHorarioReservable(horaInicio, slots, this.clock.now());
  }

  private async getOrThrow(id: string, tx?: Tx): Promise<AppointmentView> {
    const cita = await this.appointments.findById(id, tx);
    if (!cita) {
      throw new RecursoNoEncontradoError('Cita');
    }
    return cita;
  }
}
