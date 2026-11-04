import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// Habilitar (true) o deshabilitar (false) una cuenta. Deshabilitada = no puede iniciar sesión.
export class ChangeStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean({ message: 'activo debe ser true o false' })
  activo: boolean;
}
