import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SlotsQuery {
  @ApiProperty({ description: 'Servicio cuya duración determina los horarios' })
  @IsUUID('all', { message: 'serviceId debe ser un id válido' })
  serviceId: string;

  // Aquí solo se exige un texto; que la fecha exista lo valida el dominio (FechaInvalidaError).
  @ApiProperty({ example: '2026-11-10', description: 'Día en la zona de la clínica (YYYY-MM-DD)' })
  @IsString({ message: 'fecha debe ser un texto con formato YYYY-MM-DD' })
  fecha: string;
}
