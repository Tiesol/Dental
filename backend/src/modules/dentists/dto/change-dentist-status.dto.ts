import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// Habilitar (true) o deshabilitar (false) al profesional. Deshabilitado = no acepta nuevas citas;
// sus citas históricas se conservan. No afecta a su cuenta de acceso (eso es /users/:id/estado).
export class ChangeDentistStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean({ message: 'activo debe ser true o false' })
  activo: boolean;
}
