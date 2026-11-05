import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BloqueConCitasError, RecursoNoEncontradoError } from '../../common/errors/domain-error';
import { Clock } from '../../common/time/clock';
import { Role } from '../../common/types/role';
import type { Tx } from '../../prisma/prisma.service';
import { Intervalo } from '../appointments/domain/overlap';
import {
  assertOdontologoAceptaCitas,
  assertRealizaServicio,
} from '../dentists/domain/dentist-rules';
import { DentistsService } from '../dentists/dentists.service';
import { ServiceRecord } from '../services/domain/service';
import { assertServicioHabilitado } from '../services/domain/service-rules';
import { ServicesService } from '../services/services.service';
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
import {
  assertFechaValida,
  diaSemanaDe,
  fechaEnZona,
  rangoDelDia,
  tramosDelDia,
} from './domain/clinic-time';
import { calcularSlots, PASO_SLOTS_MIN } from './domain/slots';
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

  async findSlots(dentistId: string, serviceId: string, fecha: string): Promise<Intervalo[]> {
    assertFechaValida(fecha);
    const { duracionMin } = await this.assertReservable(dentistId, serviceId);
    return this.slotsDelDia({ dentistId, fecha, duracionMin });
  }

  // Reglas comunes a consultar horarios, reservar y reprogramar (PDF secciones 3, 4 y 6).
  async assertReservable(dentistId: string, serviceId: string, tx?: Tx): Promise<ServiceRecord> {
    const servicio = await this.services.getOrThrow(serviceId, tx);
    const odontologo = await this.dentists.getOrThrow(dentistId, tx);
    assertServicioHabilitado(servicio);
    assertOdontologoAceptaCitas(odontologo);
    assertRealizaServicio(odontologo, serviceId);
    return servicio;
  }

  async slotsDelDia({
    dentistId,
    fecha,
    duracionMin,
    tx,
    excluirCitaId,
  }: {
    dentistId: string;
    fecha: string;
    duracionMin: number;
    tx?: Tx;
    excluirCitaId?: string;
  }): Promise<Intervalo[]> {
    const zona = this.zonaClinica();
    const { horarios, bloques, citas } = await this.availability.findSlotInputs(
      dentistId,
      diaSemanaDe(fecha),
      rangoDelDia(fecha, zona),
      { tx, excluirCitaId },
    );
    return calcularSlots({
      tramos: tramosDelDia(fecha, horarios, zona),
      bloques,
      citas,
      duracionMin,
      ahora: this.clock.now(),
      pasoMin: PASO_SLOTS_MIN,
    });
  }

  // Rango de un día de la clínica, para filtrar por fecha. Valida que la fecha exista.
  rangoDeFecha(fecha: string): Intervalo {
    assertFechaValida(fecha);
    return rangoDelDia(fecha, this.zonaClinica());
  }

  // Día de la clínica al que pertenece un instante (ej.: la hora de inicio de una reserva).
  fechaClinica(instante: Date): string {
    return fechaEnZona(instante, this.zonaClinica());
  }

  private zonaClinica(): string {
    return this.config.getOrThrow<string>('CLINIC_TIMEZONE');
  }

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
