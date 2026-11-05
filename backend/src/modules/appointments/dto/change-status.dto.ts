import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { AppointmentStatus } from '../domain/appointment';

// CANCELADA no se acepta aquí: se cancela con PATCH /appointments/:id/cancel.
const ESTADOS = ['CONFIRMADA', 'EN_ATENCION', 'FINALIZADA'];

export class ChangeStatusDto {
  @ApiProperty({ enum: ESTADOS })
  @IsIn(ESTADOS, { message: 'estado debe ser CONFIRMADA, EN_ATENCION o FINALIZADA' })
  estado: AppointmentStatus;
}
