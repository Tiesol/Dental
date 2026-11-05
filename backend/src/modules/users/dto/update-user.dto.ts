import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Edición de un usuario por el ADMIN. El rol no se puede cambiar. Los campos de perfil que no
// apliquen al rol del usuario se rechazan con 400 (ver domain/profile-changes.ts).
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'nuevo@mail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @ApiPropertyOptional({ example: 'Ana', description: 'PACIENTE u ODONTOLOGO' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez', description: 'Solo PACIENTE' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'El apellido no puede estar vacío' })
  @MaxLength(100, { message: 'El apellido admite hasta 100 caracteres' })
  apellido?: string;

  @ApiPropertyOptional({ example: '+591 70000000', description: 'Solo PACIENTE; vacío lo borra' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono admite hasta 30 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({ example: 'Endodoncia', description: 'Solo ODONTOLOGO' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'La especialidad no puede estar vacía' })
  @MaxLength(100, { message: 'La especialidad admite hasta 100 caracteres' })
  especialidad?: string;
}
