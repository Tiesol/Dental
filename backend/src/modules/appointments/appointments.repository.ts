import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SlotUnavailableError } from '../../common/errors/domain-error';
import { lockDentist } from '../../prisma/dentist-lock';
import { PrismaService, Tx } from '../../prisma/prisma.service';
import {
  AppointmentFilters,
  AppointmentStatus,
  AppointmentView,
  NewAppointment,
} from './domain/appointment';
import { Interval } from './domain/overlap';

const withRelations = {
  service: { select: { id: true, nombre: true, duracionMin: true } },
  dentist: { select: { id: true, nombre: true, especialidad: true } },
  patient: { select: { id: true, nombre: true, apellido: true, telefono: true } },
  observation: { select: { texto: true, createdAt: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof withRelations }>;

// Único punto de acceso a la tabla Appointment con Prisma.
@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Abre la transacción con el odontólogo bloqueado: la segunda reserva simultánea espera a que
  // la primera termine y recién entonces valida (ARQUITECTURA.md sección 5).
  withDentistLock<T>(dentistId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await lockDentist(tx, dentistId);
      return fn(tx);
    });
  }

  async create(tx: Tx, data: NewAppointment): Promise<AppointmentView> {
    try {
      return toView(await tx.appointment.create({ data, include: withRelations }));
    } catch (error) {
      throw translateOverlapError(error);
    }
  }

  // Actualiza la misma fila: si el horario nuevo choca, la cita conserva el anterior (PDF sección 8).
  async updateTimes(
    tx: Tx,
    id: string,
    times: { horaInicio: Date; horaFin: Date },
  ): Promise<AppointmentView> {
    try {
      return toView(
        await tx.appointment.update({ where: { id }, data: times, include: withRelations }),
      );
    } catch (error) {
      throw translateOverlapError(error);
    }
  }

  async updateStatus(tx: Tx, id: string, status: AppointmentStatus): Promise<AppointmentView> {
    return toView(
      await tx.appointment.update({
        where: { id },
        data: { estado: status },
        include: withRelations,
      }),
    );
  }

  async findById(id: string, tx?: Tx): Promise<AppointmentView | null> {
    const row = await (tx ?? this.prisma).appointment.findUnique({
      where: { id },
      include: withRelations,
    });
    return row ? toView(row) : null;
  }

  async findByPatient(patientId: string): Promise<AppointmentView[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { patientId },
      include: withRelations,
    });
    return rows.map(toView);
  }

  async findAgenda(dentistId: string, range: Interval): Promise<AppointmentView[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        dentistId,
        estado: { not: 'CANCELADA' },
        horaInicio: { gte: range.inicio, lt: range.fin },
      },
      include: withRelations,
      orderBy: { horaInicio: 'asc' },
    });
    return rows.map(toView);
  }

  // Misma definición de "próxima" que en el historial del paciente.
  async findUpcoming(dentistId: string, now: Date, limit: number): Promise<AppointmentView[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        dentistId,
        estado: { notIn: ['CANCELADA', 'FINALIZADA'] },
        horaInicio: { gt: now },
      },
      include: withRelations,
      orderBy: { horaInicio: 'asc' },
      take: limit,
    });
    return rows.map(toView);
  }

  async findAll({
    range,
    estado: status,
    dentistId,
    limit,
    offset,
  }: AppointmentFilters): Promise<AppointmentView[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        ...(range ? { horaInicio: { gte: range.inicio, lt: range.fin } } : {}),
        ...(status ? { estado: status } : {}),
        ...(dentistId ? { dentistId } : {}),
      },
      include: withRelations,
      orderBy: { horaInicio: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(toView);
  }
}

// Última línea de defensa: si la validación falla, PostgreSQL rechaza el solapamiento.
function translateOverlapError(error: unknown): unknown {
  return error instanceof Error && error.message.includes('appointment_no_overlap')
    ? new SlotUnavailableError()
    : error;
}

function toView(row: AppointmentRow): AppointmentView {
  return {
    id: row.id,
    horaInicio: row.horaInicio,
    horaFin: row.horaFin,
    estado: row.estado,
    createdAt: row.createdAt,
    servicio: row.service,
    odontologo: row.dentist,
    paciente: row.patient,
    observacion: row.observation,
  };
}
