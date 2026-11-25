import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError, ServicesNotFoundError } from '../../common/errors/domain-error';
import { Role } from '../../common/types/role';
import type { Tx } from '../../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import { UsersService } from '../users/users.service';
import { DentistChanges, DentistPublicView, DentistRecord } from './domain/dentist';
import { uniqueIds, canViewDentist, toPublicView } from './domain/dentist-rules';
import { CreateDentistDto } from './dto/create-dentist.dto';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { DentistsRepository } from './dentists.repository';

// ADMIN recibe el registro completo (cuenta, estado, todos los servicios); el resto, la vista pública.
export type DentistView = DentistRecord | DentistPublicView;

// Casos de uso de odontólogos: gestión por el ADMIN y consulta para pacientes.
@Injectable()
export class DentistsService {
  constructor(
    private readonly dentists: DentistsRepository,
    private readonly users: UsersService,
    private readonly services: ServicesService,
  ) {}

  async findAll(role: Role, serviceId?: string): Promise<DentistView[]> {
    const isAdmin = role === 'ADMIN';
    const rows = await this.dentists.findAll({ onlyAvailable: !isAdmin, serviceId });
    return isAdmin ? rows : rows.map(toPublicView);
  }

  // Un odontólogo que no acepta citas responde 404 a quien no es ADMIN.
  async findOne(id: string, role: Role): Promise<DentistView> {
    const dentist = await this.dentists.findById(id);
    if (!dentist || !canViewDentist(role, dentist)) {
      throw new ResourceNotFoundError('Odontólogo');
    }
    return role === 'ADMIN' ? dentist : toPublicView(dentist);
  }

  async create(dto: CreateDentistDto): Promise<DentistRecord> {
    const serviceIds = uniqueIds(dto.serviceIds);
    await this.assertServicesExist(serviceIds);
    const user = await this.users.createDentist({ ...dto, serviceIds });
    return this.getOrThrow(user.dentist!.id);
  }

  async update(id: string, dto: UpdateDentistDto): Promise<DentistRecord> {
    await this.getOrThrow(id);
    const changes: DentistChanges = {};
    if (dto.nombre !== undefined) changes.nombre = dto.nombre.trim();
    if (dto.especialidad !== undefined) changes.especialidad = dto.especialidad.trim();
    return this.dentists.update(id, changes);
  }

  // Deshabilitar no toca sus citas: solo impide nuevas reservas con este profesional.
  async changeStatus(id: string, active: boolean): Promise<DentistRecord> {
    await this.getOrThrow(id);
    return this.dentists.setActive(id, active);
  }

  async setServices(id: string, ids: string[]): Promise<DentistRecord> {
    await this.getOrThrow(id);
    const serviceIds = uniqueIds(ids);
    await this.assertServicesExist(serviceIds);
    return this.dentists.replaceServices(id, serviceIds);
  }

  // Sin filtrar por rol: lo usan quienes validan una reserva, también dentro de su transacción.
  async getOrThrow(id: string, tx?: Tx): Promise<DentistRecord> {
    const dentist = await this.dentists.findById(id, tx);
    if (!dentist) {
      throw new ResourceNotFoundError('Odontólogo');
    }
    return dentist;
  }

  private async assertServicesExist(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const missing = await this.services.findMissingIds(ids);
    if (missing.length > 0) {
      throw new ServicesNotFoundError(missing);
    }
  }
}
