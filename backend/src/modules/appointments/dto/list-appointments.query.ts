import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import type { AppointmentStatus } from '../domain/appointment';

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA', 'CANCELADA'];

export class ListAppointmentsQuery {
  // Aquí solo se exige un texto; que la fecha exista lo valida el dominio (FechaInvalidaError).
  @ApiPropertyOptional({ example: '2026-11-10', description: 'Día en la zona de la clínica' })
  @IsOptional()
  @IsString({ message: 'fecha debe ser un texto con formato YYYY-MM-DD' })
  fecha?: string;

  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS, { message: 'estado no es válido' })
  estado?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'dentistId debe ser un id válido' })
  dentistId?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit admite hasta 100' })
  limit: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset debe ser un número entero' })
  @Min(0, { message: 'offset no puede ser negativo' })
  offset: number = 0;
}
