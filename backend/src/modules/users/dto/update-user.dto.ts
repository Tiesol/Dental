import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez', description: 'Solo PACIENTE' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El apellido no puede estar vacío' })
  apellido?: string;

  @ApiPropertyOptional({ example: '+591 70000000', description: 'Solo PACIENTE; vacío lo borra' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Endodoncia', description: 'Solo ODONTOLOGO' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La especialidad no puede estar vacía' })
  especialidad?: string;
}
