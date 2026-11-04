import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// Habilitar (true) o deshabilitar (false) un servicio. Deshabilitado = no admite nuevas reservas.
export class ChangeServiceStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean({ message: 'activo debe ser true o false' })
  activo: boolean;
}
