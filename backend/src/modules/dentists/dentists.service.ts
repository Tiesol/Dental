import { Injectable } from '@nestjs/common';
import {
  RecursoNoEncontradoError,
  ServiciosInexistentesError,
} from '../../common/errors/domain-error';
import { Role } from '../../common/types/role';
import type { Tx } from '../../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import { UsersService } from '../users/users.service';
import { DentistChanges, DentistPublicView, DentistRecord } from './domain/dentist';
import { idsUnicos, puedeVerOdontologo, toPublicView } from './domain/dentist-rules';
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
    const esAdmin = role === 'ADMIN';
    const rows = await this.dentists.findAll({ soloDisponibles: !esAdmin, serviceId });
    return esAdmin ? rows : rows.map(toPublicView);
  }

  // Un odontólogo que no acepta citas responde 404 a quien no es ADMIN.
  async findOne(id: string, role: Role): Promise<DentistView> {
    const dentist = await this.dentists.findById(id);
    if (!dentist || !puedeVerOdontologo(role, dentist)) {
      throw new RecursoNoEncontradoError('Odontólogo');
    }
    return role === 'ADMIN' ? dentist : toPublicView(dentist);
  }

  async create(dto: CreateDentistDto): Promise<DentistRecord> {
    const serviceIds = idsUnicos(dto.serviceIds);
    await this.assertServiciosExisten(serviceIds);
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
  async changeStatus(id: string, activo: boolean): Promise<DentistRecord> {
    await this.getOrThrow(id);
    return this.dentists.setActivo(id, activo);
  }

  async setServices(id: string, ids: string[]): Promise<DentistRecord> {
    await this.getOrThrow(id);
    const serviceIds = idsUnicos(ids);
    await this.assertServiciosExisten(serviceIds);
    return this.dentists.replaceServices(id, serviceIds);
  }

  // Sin filtrar por rol: lo usan quienes validan una reserva, también dentro de su transacción.
  async getOrThrow(id: string, tx?: Tx): Promise<DentistRecord> {
    const dentist = await this.dentists.findById(id, tx);
    if (!dentist) {
      throw new RecursoNoEncontradoError('Odontólogo');
    }
    return dentist;
  }

  private async assertServiciosExisten(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const faltantes = await this.services.findMissingIds(ids);
    if (faltantes.length > 0) {
      throw new ServiciosInexistentesError(faltantes);
    }
  }
}
