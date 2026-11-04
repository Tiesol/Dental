import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DentistChanges, DentistRecord } from './domain/dentist';

const withRelations = {
  user: { select: { email: true, activo: true } },
  services: { include: { service: true } },
} satisfies Prisma.DentistInclude;

type DentistRow = Prisma.DentistGetPayload<{ include: typeof withRelations }>;

// Único punto de acceso a Dentist y DentistService con Prisma.
@Injectable()
export class DentistsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // soloDisponibles: profesional y cuenta habilitados. serviceId: solo quienes lo realizan
  // (y, si soloDisponibles, solo si ese servicio está habilitado).
  async findAll(options: {
    soloDisponibles: boolean;
    serviceId?: string;
  }): Promise<DentistRecord[]> {
    const where: Prisma.DentistWhereInput = {
      ...(options.soloDisponibles ? { activo: true, user: { activo: true } } : {}),
      ...(options.serviceId
        ? {
            services: {
              some: {
                serviceId: options.serviceId,
                ...(options.soloDisponibles ? { service: { activo: true } } : {}),
              },
            },
          }
        : {}),
    };
    const rows = await this.prisma.dentist.findMany({
      where,
      include: withRelations,
      orderBy: { nombre: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<DentistRecord | null> {
    const row = await this.prisma.dentist.findUnique({ where: { id }, include: withRelations });
    return row ? toRecord(row) : null;
  }

  async update(id: string, changes: DentistChanges): Promise<DentistRecord> {
    const row = await this.prisma.dentist.update({
      where: { id },
      data: changes,
      include: withRelations,
    });
    return toRecord(row);
  }

  async setActivo(id: string, activo: boolean): Promise<DentistRecord> {
    const row = await this.prisma.dentist.update({
      where: { id },
      data: { activo },
      include: withRelations,
    });
    return toRecord(row);
  }

  // Reemplaza el conjunto completo de servicios en una transacción (borra y vuelve a crear),
  // para que nunca quede a medias.
  async replaceServices(id: string, serviceIds: string[]): Promise<DentistRecord> {
    await this.prisma.$transaction([
      this.prisma.dentistService.deleteMany({ where: { dentistId: id } }),
      this.prisma.dentistService.createMany({
        data: serviceIds.map((serviceId) => ({ dentistId: id, serviceId })),
      }),
    ]);
    return toRecord(
      await this.prisma.dentist.findUniqueOrThrow({ where: { id }, include: withRelations }),
    );
  }
}

function toRecord(row: DentistRow): DentistRecord {
  return {
    id: row.id,
    userId: row.userId,
    email: row.user.email,
    cuentaActiva: row.user.activo,
    nombre: row.nombre,
    especialidad: row.especialidad,
    activo: row.activo,
    servicios: row.services
      .map(({ service }) => ({
        id: service.id,
        nombre: service.nombre,
        duracionMin: service.duracionMin,
        activo: service.activo,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  };
}
