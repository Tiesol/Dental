import { Injectable } from '@nestjs/common';
import { BloqueConCitasError, RecursoNoEncontradoError } from '../../common/errors/domain-error';
import { Clock } from '../../common/time/clock';
import { Role } from '../../common/types/role';
import { DentistsService } from '../dentists/dentists.service';
import { AvailabilityRepository } from './availability.repository';
import {
  AvailabilityRuleInput,
  AvailabilityView,
  PublicAvailabilityView,
  UnavailableBlockRecord,
} from './domain/availability';
import {
  assertBloqueValido,
  assertHorariosValidos,
  toPublicAvailability,
} from './domain/availability-rules';
import { CreateBlockDto } from './dto/create-block.dto';

// Casos de uso de la disponibilidad: consulta para todos y gestión por el ADMIN.
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly availability: AvailabilityRepository,
    private readonly dentists: DentistsService,
    private readonly clock: Clock,
  ) {}

  // Misma visibilidad que GET /dentists/:id: quien no es ADMIN recibe 404 si no acepta citas.
  async find(dentistId: string, role: Role): Promise<AvailabilityView | PublicAvailabilityView> {
    await this.dentists.findOne(dentistId, role);
    const vista = await this.availability.findByDentist(dentistId, this.clock.now());
    return role === 'ADMIN' ? vista : toPublicAvailability(vista);
  }

  // Las citas ya creadas fuera del horario nuevo se conservan (decisión D6 de PLAN.md).
  async replaceHorarios(
    dentistId: string,
    horarios: AvailabilityRuleInput[],
  ): Promise<AvailabilityView> {
    await this.dentists.findOne(dentistId, 'ADMIN');
    assertHorariosValidos(horarios);
    await this.availability.replaceRules(dentistId, horarios);
    return this.availability.findByDentist(dentistId, this.clock.now());
  }

  async createBlock(dentistId: string, dto: CreateBlockDto): Promise<UnavailableBlockRecord> {
    await this.dentists.findOne(dentistId, 'ADMIN');
    const inicio = new Date(dto.inicio);
    const fin = new Date(dto.fin);
    assertBloqueValido({ inicio, fin }, this.clock.now());
    const bloque = await this.availability.createBlockIfFree(dentistId, {
      inicio,
      fin,
      motivo: dto.motivo ?? null,
    });
    if (!bloque) {
      throw new BloqueConCitasError();
    }
    return bloque;
  }

  async deleteBlock(dentistId: string, blockId: string): Promise<void> {
    await this.dentists.findOne(dentistId, 'ADMIN');
    const borrado = await this.availability.deleteBlock(dentistId, blockId);
    if (!borrado) {
      throw new RecursoNoEncontradoError('Bloque');
    }
  }
}
