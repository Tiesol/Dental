import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Edición del propio perfil. Email, rol y especialidad los gestiona el ADMIN.
// PACIENTE: nombre, apellido, teléfono. ODONTOLOGO: nombre. ADMIN: no tiene perfil.
export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'El apellido no puede estar vacío' })
  @MaxLength(100, { message: 'El apellido admite hasta 100 caracteres' })
  apellido?: string;

  @ApiPropertyOptional({ example: '+591 70000000', description: 'Vacío lo borra' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono admite hasta 30 caracteres' })
  telefono?: string;
}
