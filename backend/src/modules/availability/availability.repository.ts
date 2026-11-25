import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockDentist } from '../../prisma/dentist-lock';
import { PrismaService, Tx } from '../../prisma/prisma.service';
import { Interval } from '../appointments/domain/overlap';
import {
  AvailabilityRuleInput,
  AvailabilityView,
  NewUnavailableBlock,
  SlotInputs,
  UnavailableBlockRecord,
} from './domain/availability';

const blockFields = {
  id: true,
  inicio: true,
  fin: true,
  motivo: true,
} satisfies Prisma.UnavailableBlockSelect;

// Único punto de acceso a AvailabilityRule y UnavailableBlock con Prisma.
@Injectable()
export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Horarios ordenados por día y hora, y bloques que aún no terminan (fin > ahora).
  async findByDentist(dentistId: string, now: Date): Promise<AvailabilityView> {
    const [schedule, blocks] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { dentistId },
        select: { id: true, diaSemana: true, minutoInicio: true, minutoFin: true },
        orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }],
      }),
      this.prisma.unavailableBlock.findMany({
        where: { dentistId, fin: { gt: now } },
        select: blockFields,
        orderBy: { inicio: 'asc' },
      }),
    ]);
    return { horarios: schedule, bloques: blocks };
  }

  // Lo que necesita el cálculo de horarios de un día. Una reserva lo lee dentro de su transacción,
  // y al reprogramar se excluye la propia cita para poder moverla a un horario que se cruza con ella.
  async findSlotInputs(
    dentistId: string,
    weekday: number,
    { inicio: start, fin: end }: Interval,
    { tx, excludeAppointmentId }: { tx?: Tx; excludeAppointmentId?: string } = {},
  ): Promise<SlotInputs> {
    const db = tx ?? this.prisma;
    const schedule = await db.availabilityRule.findMany({
      where: { dentistId, diaSemana: weekday },
      select: { diaSemana: true, minutoInicio: true, minutoFin: true },
    });
    const blocks = await db.unavailableBlock.findMany({
      where: { dentistId, inicio: { lt: end }, fin: { gt: start } },
      select: { inicio: true, fin: true },
    });
    const appointments = await db.appointment.findMany({
      where: {
        dentistId,
        estado: { not: 'CANCELADA' },
        horaInicio: { lt: end },
        horaFin: { gt: start },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { horaInicio: true, horaFin: true },
    });
    return {
      horarios: schedule,
      bloques: blocks,
      citas: appointments.map(({ horaInicio: startsAt, horaFin: endsAt }) => ({
        inicio: startsAt,
        fin: endsAt,
      })),
    };
  }

  // Borra y vuelve a crear en una transacción, para que nunca quede a medias.
  async replaceRules(dentistId: string, schedule: AvailabilityRuleInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockDentist(tx, dentistId);
      await tx.availabilityRule.deleteMany({ where: { dentistId } });
      await tx.availabilityRule.createMany({
        data: schedule.map(
          ({ diaSemana: weekday, minutoInicio: startMinute, minutoFin: endMinute }) => ({
            dentistId,
            diaSemana: weekday,
            minutoInicio: startMinute,
            minutoFin: endMinute,
          }),
        ),
      });
    });
  }

  // Devuelve null, sin crear nada, si el bloque choca con una cita activa (estado distinto de
  // CANCELADA). Los intervalos son semiabiertos: una cita consecutiva al bloque no choca.
  async createBlockIfFree(
    dentistId: string,
    { inicio: start, fin: end, motivo: reason }: NewUnavailableBlock,
  ): Promise<UnavailableBlockRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      await lockDentist(tx, dentistId);
      const appointmentsInBlock = await tx.appointment.count({
        where: {
          dentistId,
          estado: { not: 'CANCELADA' },
          horaInicio: { lt: end },
          horaFin: { gt: start },
        },
      });
      if (appointmentsInBlock > 0) {
        return null;
      }
      return tx.unavailableBlock.create({
        data: { dentistId, inicio: start, fin: end, motivo: reason },
        select: blockFields,
      });
    });
  }

  // Filtra también por odontólogo: un bloque ajeno no se borra. Indica si borró algo.
  async deleteBlock(dentistId: string, blockId: string): Promise<boolean> {
    const { count } = await this.prisma.unavailableBlock.deleteMany({
      where: { id: blockId, dentistId },
    });
    return count > 0;
  }
}
