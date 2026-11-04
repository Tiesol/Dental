import { Injectable } from '@nestjs/common';
import { Service } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NewService, ServiceChanges, ServiceRecord } from './domain/service';

// Único punto de acceso a la tabla Service con Prisma.
@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: { soloActivos: boolean }): Promise<ServiceRecord[]> {
    const rows = await this.prisma.service.findMany({
      where: options.soloActivos ? { activo: true } : {},
      orderBy: { nombre: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<ServiceRecord | null> {
    const row = await this.prisma.service.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  // Búsqueda sin distinguir mayúsculas, para no permitir "Limpieza" y "limpieza" a la vez.
  async findByNombre(nombre: string): Promise<ServiceRecord | null> {
    const row = await this.prisma.service.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
    });
    return row ? toRecord(row) : null;
  }

  async create(data: NewService): Promise<ServiceRecord> {
    return toRecord(await this.prisma.service.create({ data }));
  }

  async update(id: string, changes: ServiceChanges): Promise<ServiceRecord> {
    return toRecord(await this.prisma.service.update({ where: { id }, data: changes }));
  }

  async setActivo(id: string, activo: boolean): Promise<ServiceRecord> {
    return toRecord(await this.prisma.service.update({ where: { id }, data: { activo } }));
  }
}

function toRecord(row: Service): ServiceRecord {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    duracionMin: row.duracionMin,
    precioReferencial: row.precioReferencial === null ? null : row.precioReferencial.toNumber(),
    activo: row.activo,
  };
}
