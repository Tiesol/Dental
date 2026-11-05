import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityRuleInput, AvailabilityView } from './domain/availability';

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
        select: { id: true, inicio: true, fin: true, motivo: true },
        orderBy: { inicio: 'asc' },
      }),
    ]);
    return { horarios, bloques };
  }

  // Borra y vuelve a crear en una transacción, para que nunca quede a medias.
  async replaceRules(dentistId: string, horarios: AvailabilityRuleInput[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.availabilityRule.deleteMany({ where: { dentistId } }),
      this.prisma.availabilityRule.createMany({
        data: horarios.map(({ diaSemana, minutoInicio, minutoFin }) => ({
          dentistId,
          diaSemana,
          minutoInicio,
          minutoFin,
        })),
      }),
    ]);
  }
}
