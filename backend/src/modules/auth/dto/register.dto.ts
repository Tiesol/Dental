import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Registro público: siempre crea un PACIENTE. El rol nunca viene del cliente.
export class RegisterDto {
  @ApiProperty({ example: 'ana@mail.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'secreta123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña admite hasta 72 caracteres' })
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @Matches(/\S/, { message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @Matches(/\S/, { message: 'El apellido es obligatorio' })
  @MaxLength(100, { message: 'El apellido admite hasta 100 caracteres' })
  apellido: string;

  @ApiPropertyOptional({ example: '+591 70000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono admite hasta 30 caracteres' })
  telefono?: string;
}
