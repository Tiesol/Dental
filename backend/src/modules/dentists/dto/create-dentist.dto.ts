import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

// Registro de un odontólogo por el ADMIN: crea su cuenta de acceso, su perfil profesional y los
// servicios que realiza, en una sola operación (PDF sección 4).
export class CreateDentistDto {
  @ApiProperty({ example: 'carlos.rojas@clinica.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'secreta123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña admite hasta 72 caracteres' })
  password: string;

  @ApiProperty({ example: 'Dr. Carlos Rojas' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre: string;

  @ApiProperty({ example: 'Ortodoncia' })
  @IsString()
  @IsNotEmpty({ message: 'La especialidad es obligatoria' })
  @MaxLength(100, { message: 'La especialidad admite hasta 100 caracteres' })
  especialidad: string;

  @ApiProperty({ type: [String], example: [], description: 'Ids de los servicios que realiza' })
  @IsArray({ message: 'serviceIds debe ser una lista' })
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true, message: 'Cada servicio debe ser un id válido' })
  serviceIds: string[];
}
