import { Injectable } from '@nestjs/common';
import { DuplicateServiceNameError, ResourceNotFoundError } from '../../common/errors/domain-error';
import { Role } from '../../common/types/role';
import type { Tx } from '../../prisma/prisma.service';
import { ServiceChanges, ServiceRecord } from './domain/service';
import { normalizeServiceName, canViewService } from './domain/service-rules';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesRepository } from './services.repository';

// Casos de uso del catálogo de servicios dentales.
@Injectable()
export class ServicesService {
  constructor(private readonly services: ServicesRepository) {}

  // ADMIN ve todos; PACIENTE y ODONTOLOGO solo los habilitados.
  findAll(role: Role): Promise<ServiceRecord[]> {
    return this.services.findAll({ onlyActive: role !== 'ADMIN' });
  }

  // Un servicio deshabilitado responde 404 a quien no es ADMIN: para él no existe en el catálogo.
  async findOne(id: string, role: Role): Promise<ServiceRecord> {
    const service = await this.services.findById(id);
    if (!service || !canViewService(role, service)) {
      throw new ResourceNotFoundError('Servicio');
    }
    return service;
  }

  async create(dto: CreateServiceDto): Promise<ServiceRecord> {
    const name = normalizeServiceName(dto.nombre);
    await this.assertNameAvailable(name);
    return this.services.create({
      nombre: name,
      descripcion: dto.descripcion.trim(),
      duracionMin: dto.duracionMin,
      precioReferencial: dto.precioReferencial ?? null,
      activo: dto.activo ?? true,
    });
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceRecord> {
    const current = await this.getOrThrow(id);
    const changes: ServiceChanges = {};
    if (dto.nombre !== undefined) {
      const name = normalizeServiceName(dto.nombre);
      if (name.toLowerCase() !== current.nombre.toLowerCase()) {
        await this.assertNameAvailable(name);
      }
      changes.nombre = name;
    }
    if (dto.descripcion !== undefined) changes.descripcion = dto.descripcion.trim();
    if (dto.duracionMin !== undefined) changes.duracionMin = dto.duracionMin;
    if (dto.precioReferencial !== undefined) changes.precioReferencial = dto.precioReferencial;
    return this.services.update(id, changes);
  }

  // Deshabilitar no toca las citas existentes: solo impide nuevas reservas con este servicio.
  async changeStatus(id: string, active: boolean): Promise<ServiceRecord> {
    await this.getOrThrow(id);
    return this.services.setActive(id, active);
  }

  // Ids de la lista que no corresponden a ningún servicio (lo usa dentists al asignar servicios).
  async findMissingIds(ids: string[]): Promise<string[]> {
    const existing = new Set((await this.services.findByIds(ids)).map((s) => s.id));
    return ids.filter((id) => !existing.has(id));
  }

  // Sin filtrar por rol: lo usan quienes validan una reserva, también dentro de su transacción.
  async getOrThrow(id: string, tx?: Tx): Promise<ServiceRecord> {
    const service = await this.services.findById(id, tx);
    if (!service) {
      throw new ResourceNotFoundError('Servicio');
    }
    return service;
  }

  private async assertNameAvailable(name: string): Promise<void> {
    if (await this.services.findByName(name)) {
      throw new DuplicateServiceNameError();
    }
  }
}
