import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { CuandoCitas } from '../domain/appointment';

export class ListMyAppointmentsQuery {
  @ApiPropertyOptional({ enum: ['proximas', 'historial'] })
  @IsOptional()
  @IsIn(['proximas', 'historial'], { message: 'cuando debe ser proximas o historial' })
  cuando?: CuandoCitas;
}
