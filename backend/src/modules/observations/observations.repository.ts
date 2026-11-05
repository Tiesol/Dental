import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ObservacionYaRegistradaError } from '../../common/errors/domain-error';
import { PrismaService } from '../../prisma/prisma.service';

// Único punto de acceso a la tabla Observation con Prisma.
@Injectable()
export class ObservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Si dos peticiones pasan la validación a la vez, la restricción única rechaza la segunda.
  async create(appointmentId: string, texto: string): Promise<{ texto: string; createdAt: Date }> {
    try {
      return await this.prisma.observation.create({
        data: { appointmentId, texto },
        select: { texto: true, createdAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ObservacionYaRegistradaError();
      }
      throw error;
    }
  }
}
