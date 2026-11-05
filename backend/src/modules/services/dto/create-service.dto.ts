import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// Alta de un servicio dental (solo ADMIN). Campos mínimos del PDF sección 3.
export class CreateServiceDto {
  @ApiProperty({ example: 'Limpieza dental' })
  @IsString()
  @Matches(/\S/, { message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre: string;

  @ApiProperty({ example: 'Profilaxis y eliminación de sarro' })
  @IsString()
  @Matches(/\S/, { message: 'La descripción es obligatoria' })
  @MaxLength(500, { message: 'La descripción admite hasta 500 caracteres' })
  descripcion: string;

  @ApiProperty({ example: 30, minimum: 1, maximum: 480 })
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración debe ser positiva' })
  @Max(480, { message: 'La duración no puede superar 480 minutos (8 horas)' })
  duracionMin: number;

  @ApiPropertyOptional({ example: 150, nullable: true, description: 'Opcional' })
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con hasta 2 decimales' },
  )
  @Min(0, { message: 'El precio no puede ser negativo' })
  precioReferencial?: number | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: 'activo debe ser true o false' })
  activo?: boolean;
}
