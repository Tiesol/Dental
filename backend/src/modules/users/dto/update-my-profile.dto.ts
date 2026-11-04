import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Edición del propio perfil. Email, rol y especialidad los gestiona el ADMIN.
// PACIENTE: nombre, apellido, teléfono. ODONTOLOGO: nombre. ADMIN: no tiene perfil.
export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El apellido no puede estar vacío' })
  apellido?: string;

  @ApiPropertyOptional({ example: '+591 70000000', description: 'Vacío lo borra' })
  @IsOptional()
  @IsString()
  telefono?: string;
}
