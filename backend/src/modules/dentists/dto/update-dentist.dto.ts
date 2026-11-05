import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Datos profesionales. El estado y los servicios se cambian con sus propios endpoints.
export class UpdateDentistDto {
  @ApiPropertyOptional({ example: 'Dr. Carlos Rojas' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Ortodoncia' })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'La especialidad no puede estar vacía' })
  @MaxLength(100, { message: 'La especialidad admite hasta 100 caracteres' })
  especialidad?: string;
}
