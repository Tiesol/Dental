import { Injectable } from '@nestjs/common';
import {
  NombreDeServicioDuplicadoError,
  RecursoNoEncontradoError,
} from '../../common/errors/domain-error';
import { Role } from '../../common/types/role';
import type { Tx } from '../../prisma/prisma.service';
import { ServiceChanges, ServiceRecord } from './domain/service';
import { normalizarNombreServicio, puedeVerServicio } from './domain/service-rules';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesRepository } from './services.repository';

// Casos de uso del catálogo de servicios dentales.
@Injectable()
export class ServicesService {
  constructor(private readonly services: ServicesRepository) {}

  // ADMIN ve todos; PACIENTE y ODONTOLOGO solo los habilitados.
  findAll(role: Role): Promise<ServiceRecord[]> {
    return this.services.findAll({ soloActivos: role !== 'ADMIN' });
  }

  // Un servicio deshabilitado responde 404 a quien no es ADMIN: para él no existe en el catálogo.
  async findOne(id: string, role: Role): Promise<ServiceRecord> {
    const service = await this.services.findById(id);
    if (!service || !puedeVerServicio(role, service)) {
      throw new RecursoNoEncontradoError('Servicio');
    }
    return service;
  }

  async create(dto: CreateServiceDto): Promise<ServiceRecord> {
    const nombre = normalizarNombreServicio(dto.nombre);
    await this.assertNombreLibre(nombre);
    return this.services.create({
      nombre,
      descripcion: dto.descripcion.trim(),
      duracionMin: dto.duracionMin,
      precioReferencial: dto.precioReferencial ?? null,
      activo: dto.activo ?? true,
    });
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceRecord> {
    const actual = await this.getOrThrow(id);
    const changes: ServiceChanges = {};
    if (dto.nombre !== undefined) {
      const nombre = normalizarNombreServicio(dto.nombre);
      if (nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
        await this.assertNombreLibre(nombre);
      }
      changes.nombre = nombre;
    }
    if (dto.descripcion !== undefined) changes.descripcion = dto.descripcion.trim();
    if (dto.duracionMin !== undefined) changes.duracionMin = dto.duracionMin;
    if (dto.precioReferencial !== undefined) changes.precioReferencial = dto.precioReferencial;
    return this.services.update(id, changes);
  }

  // Deshabilitar no toca las citas existentes: solo impide nuevas reservas con este servicio.
  async changeStatus(id: string, activo: boolean): Promise<ServiceRecord> {
    await this.getOrThrow(id);
    return this.services.setActivo(id, activo);
  }

  // Ids de la lista que no corresponden a ningún servicio (lo usa dentists al asignar servicios).
  async findMissingIds(ids: string[]): Promise<string[]> {
    const existentes = new Set((await this.services.findByIds(ids)).map((s) => s.id));
    return ids.filter((id) => !existentes.has(id));
  }

  // Sin filtrar por rol: lo usan quienes validan una reserva, también dentro de su transacción.
  async getOrThrow(id: string, tx?: Tx): Promise<ServiceRecord> {
    const service = await this.services.findById(id, tx);
    if (!service) {
      throw new RecursoNoEncontradoError('Servicio');
    }
    return service;
  }

  private async assertNombreLibre(nombre: string): Promise<void> {
    if (await this.services.findByNombre(nombre)) {
      throw new NombreDeServicioDuplicadoError();
    }
  }
}
