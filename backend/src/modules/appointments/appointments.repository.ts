import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HorarioNoDisponibleError } from '../../common/errors/domain-error';
import { lockDentist } from '../../prisma/dentist-lock';
import { PrismaService, Tx } from '../../prisma/prisma.service';
import {
  AppointmentFilters,
  AppointmentStatus,
  AppointmentView,
  NewAppointment,
} from './domain/appointment';

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

  async create(tx: Tx, datos: NewAppointment): Promise<AppointmentView> {
    try {
      return toView(await tx.appointment.create({ data: datos, include: withRelations }));
    } catch (error) {
      throw traducirSolapamiento(error);
    }
  }

  // Actualiza la misma fila: si el horario nuevo choca, la cita conserva el anterior (PDF sección 8).
  async updateHorario(
    tx: Tx,
    id: string,
    horario: { horaInicio: Date; horaFin: Date },
  ): Promise<AppointmentView> {
    try {
      return toView(
        await tx.appointment.update({ where: { id }, data: horario, include: withRelations }),
      );
    } catch (error) {
      throw traducirSolapamiento(error);
    }
  }

  async updateEstado(tx: Tx, id: string, estado: AppointmentStatus): Promise<AppointmentView> {
    return toView(
      await tx.appointment.update({ where: { id }, data: { estado }, include: withRelations }),
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

  async findAll({
    rango,
    estado,
    dentistId,
    limit,
    offset,
  }: AppointmentFilters): Promise<AppointmentView[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        ...(rango ? { horaInicio: { gte: rango.inicio, lt: rango.fin } } : {}),
        ...(estado ? { estado } : {}),
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
function traducirSolapamiento(error: unknown): unknown {
  return error instanceof Error && error.message.includes('appointment_no_overlap')
    ? new HorarioNoDisponibleError()
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
