import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { AppointmentStatus } from '../domain/appointment';

// CANCELADA no se acepta aquí: se cancela con PATCH /appointments/:id/cancel. PENDIENTE sí, aunque
// nada vuelve a ese estado: así la máquina de estados responde 409, como exige la regla.
const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA'];

export class ChangeStatusDto {
  @ApiProperty({ enum: ESTADOS })
  @IsIn(ESTADOS, { message: 'estado no es válido' })
  estado: AppointmentStatus;
}
