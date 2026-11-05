import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { STAFF_ROLES, type StaffRole } from '../domain/user';

// Alta de personal por el ADMIN. Los pacientes no se crean aquí: se registran solos.
export class CreateUserDto {
  @ApiProperty({ example: 'odontologo2@clinica.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'secreta123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña admite hasta 72 caracteres' })
  password: string;

  @ApiProperty({ enum: STAFF_ROLES, example: 'ODONTOLOGO' })
  @IsIn(STAFF_ROLES, {
    message: 'El rol debe ser ODONTOLOGO o ADMIN (los pacientes se registran solos)',
  })
  role: StaffRole;

  @ApiPropertyOptional({
    example: 'Dr. Juan Rojas',
    description: 'Obligatorio si role = ODONTOLOGO',
  })
  @ValidateIf((dto: CreateUserDto) => dto.role === 'ODONTOLOGO')
  @IsString()
  @Matches(/\S/, { message: 'El nombre es obligatorio para un odontólogo' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Ortodoncia', description: 'Obligatorio si role = ODONTOLOGO' })
  @ValidateIf((dto: CreateUserDto) => dto.role === 'ODONTOLOGO')
  @IsString()
  @Matches(/\S/, { message: 'La especialidad es obligatoria para un odontólogo' })
  @MaxLength(100, { message: 'La especialidad admite hasta 100 caracteres' })
  especialidad?: string;
}
