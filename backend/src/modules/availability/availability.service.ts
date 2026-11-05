import { Injectable } from '@nestjs/common';
import { Clock } from '../../common/time/clock';
import { Role } from '../../common/types/role';
import { DentistsService } from '../dentists/dentists.service';
import { AvailabilityRepository } from './availability.repository';
import { AvailabilityRuleInput, AvailabilityView } from './domain/availability';
import { assertHorariosValidos } from './domain/availability-rules';

// Casos de uso de la disponibilidad: consulta para todos y gestión por el ADMIN.
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly availability: AvailabilityRepository,
    private readonly dentists: DentistsService,
    private readonly clock: Clock,
  ) {}

  // Misma visibilidad que GET /dentists/:id: quien no es ADMIN recibe 404 si no acepta citas.
  async find(dentistId: string, role: Role): Promise<AvailabilityView> {
    await this.dentists.findOne(dentistId, role);
    return this.availability.findByDentist(dentistId, this.clock.now());
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
}
