import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AvailabilityRuleInput,
  AvailabilityView,
  NewUnavailableBlock,
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
  async findByDentist(dentistId: string, ahora: Date): Promise<AvailabilityView> {
    const [horarios, bloques] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { dentistId },
        select: { id: true, diaSemana: true, minutoInicio: true, minutoFin: true },
        orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }],
      }),
      this.prisma.unavailableBlock.findMany({
        where: { dentistId, fin: { gt: ahora } },
        select: blockFields,
        orderBy: { inicio: 'asc' },
      }),
    ]);
    return { horarios, bloques };
  }

  // Borra y vuelve a crear en una transacción, para que nunca quede a medias.
  async replaceRules(dentistId: string, horarios: AvailabilityRuleInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockDentist(tx, dentistId);
      await tx.availabilityRule.deleteMany({ where: { dentistId } });
      await tx.availabilityRule.createMany({
        data: horarios.map(({ diaSemana, minutoInicio, minutoFin }) => ({
          dentistId,
          diaSemana,
          minutoInicio,
          minutoFin,
        })),
      });
    });
  }

  // Devuelve null, sin crear nada, si el bloque choca con una cita activa (estado distinto de
  // CANCELADA). Los intervalos son semiabiertos: una cita consecutiva al bloque no choca.
  async createBlockIfFree(
    dentistId: string,
    { inicio, fin, motivo }: NewUnavailableBlock,
  ): Promise<UnavailableBlockRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      await lockDentist(tx, dentistId);
      const citasEnElBloque = await tx.appointment.count({
        where: {
          dentistId,
          estado: { not: 'CANCELADA' },
          horaInicio: { lt: fin },
          horaFin: { gt: inicio },
        },
      });
      if (citasEnElBloque > 0) {
        return null;
      }
      return tx.unavailableBlock.create({
        data: { dentistId, inicio, fin, motivo },
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

// El mismo bloqueo que serializa las reservas de un odontólogo (ARQUITECTURA.md sección 5): sin él,
// un bloque podría crearse mientras se confirma una cita que choca con él.
async function lockDentist(tx: Prisma.TransactionClient, dentistId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Dentist" WHERE id = ${dentistId} FOR UPDATE`;
}
