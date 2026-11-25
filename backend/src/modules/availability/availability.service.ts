import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockHasAppointmentsError, ResourceNotFoundError } from '../../common/errors/domain-error';
import { Clock } from '../../common/time/clock';
import { Role } from '../../common/types/role';
import type { Tx } from '../../prisma/prisma.service';
import { Interval } from '../appointments/domain/overlap';
import {
  assertDentistAcceptsAppointments,
  assertOffersService,
} from '../dentists/domain/dentist-rules';
import { DentistsService } from '../dentists/dentists.service';
import { ServiceRecord } from '../services/domain/service';
import { assertServiceEnabled } from '../services/domain/service-rules';
import { ServicesService } from '../services/services.service';
import { AvailabilityRepository } from './availability.repository';
import {
  AvailabilityRuleInput,
  AvailabilityView,
  PublicAvailabilityView,
  UnavailableBlockRecord,
} from './domain/availability';
import {
  assertValidBlock,
  assertValidSchedule,
  toPublicAvailability,
} from './domain/availability-rules';
import {
  assertValidDate,
  weekdayOf,
  dateInZone,
  dayRange,
  dayTimeRanges,
} from './domain/clinic-time';
import { calculateSlots, SLOT_STEP_MIN } from './domain/slots';
import { CreateBlockDto } from './dto/create-block.dto';

// Casos de uso de la disponibilidad: consulta para todos y gestión por el ADMIN.
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly availability: AvailabilityRepository,
    private readonly dentists: DentistsService,
    private readonly services: ServicesService,
    private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  async findSlots(dentistId: string, serviceId: string, date: string): Promise<Interval[]> {
    assertValidDate(date);
    const { duracionMin: durationMin } = await this.assertBookable(dentistId, serviceId);
    return this.daySlots({ dentistId, fecha: date, duracionMin: durationMin });
  }

  // Reglas comunes a consultar horarios, reservar y reprogramar (PDF secciones 3, 4 y 6).
  async assertBookable(dentistId: string, serviceId: string, tx?: Tx): Promise<ServiceRecord> {
    const service = await this.services.getOrThrow(serviceId, tx);
    const dentist = await this.dentists.getOrThrow(dentistId, tx);
    assertServiceEnabled(service);
    assertDentistAcceptsAppointments(dentist);
    assertOffersService(dentist, serviceId);
    return service;
  }

  async daySlots({
    dentistId,
    fecha: date,
    duracionMin: durationMin,
    tx,
    excludeAppointmentId,
  }: {
    dentistId: string;
    fecha: string;
    duracionMin: number;
    tx?: Tx;
    excludeAppointmentId?: string;
  }): Promise<Interval[]> {
    const zone = this.clinicZone();
    const {
      horarios: schedule,
      bloques: blocks,
      citas: appointments,
    } = await this.availability.findSlotInputs(dentistId, weekdayOf(date), dayRange(date, zone), {
      tx,
      excludeAppointmentId,
    });
    return calculateSlots({
      timeRanges: dayTimeRanges(date, schedule, zone),
      blocks,
      appointments,
      duracionMin: durationMin,
      now: this.clock.now(),
      stepMin: SLOT_STEP_MIN,
    });
  }

  // Rango de un día de la clínica, para filtrar por fecha. Valida que la fecha exista.
  dateRange(date: string): Interval {
    assertValidDate(date);
    return dayRange(date, this.clinicZone());
  }

  // Día de la clínica al que pertenece un instante (ej.: la hora de inicio de una reserva).
  clinicDate(instant: Date): string {
    return dateInZone(instant, this.clinicZone());
  }

  private clinicZone(): string {
    return this.config.getOrThrow<string>('CLINIC_TIMEZONE');
  }

  // Misma visibilidad que GET /dentists/:id: quien no es ADMIN recibe 404 si no acepta citas.
  async find(dentistId: string, role: Role): Promise<AvailabilityView | PublicAvailabilityView> {
    await this.dentists.findOne(dentistId, role);
    const view = await this.availability.findByDentist(dentistId, this.clock.now());
    return role === 'ADMIN' ? view : toPublicAvailability(view);
  }

  // Las citas ya creadas fuera del horario nuevo se conservan (decisión D6 de PLAN.md).
  async replaceSchedule(
    dentistId: string,
    schedule: AvailabilityRuleInput[],
  ): Promise<AvailabilityView> {
    await this.dentists.findOne(dentistId, 'ADMIN');
    assertValidSchedule(schedule);
    await this.availability.replaceRules(dentistId, schedule);
    return this.availability.findByDentist(dentistId, this.clock.now());
  }

  async createBlock(dentistId: string, dto: CreateBlockDto): Promise<UnavailableBlockRecord> {
    await this.dentists.findOne(dentistId, 'ADMIN');
    const start = new Date(dto.inicio);
    const end = new Date(dto.fin);
    assertValidBlock({ inicio: start, fin: end }, this.clock.now());
    const block = await this.availability.createBlockIfFree(dentistId, {
      inicio: start,
      fin: end,
      motivo: dto.motivo ?? null,
    });
    if (!block) {
      throw new BlockHasAppointmentsError();
    }
    return block;
  }

  async deleteBlock(dentistId: string, blockId: string): Promise<void> {
    await this.dentists.findOne(dentistId, 'ADMIN');
    const borrado = await this.availability.deleteBlock(dentistId, blockId);
    if (!borrado) {
      throw new ResourceNotFoundError('Bloque');
    }
  }
}
