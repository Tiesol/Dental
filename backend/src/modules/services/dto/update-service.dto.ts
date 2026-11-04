import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// Edición de un servicio (solo ADMIN). El estado se cambia con PATCH /services/:id/estado.
export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Limpieza dental' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Profilaxis y eliminación de sarro' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @MaxLength(500, { message: 'La descripción admite hasta 500 caracteres' })
  descripcion?: string;

  @ApiPropertyOptional({ example: 45, minimum: 1, maximum: 480 })
  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración debe ser positiva' })
  @Max(480, { message: 'La duración no puede superar 480 minutos (8 horas)' })
  duracionMin?: number;

  @ApiPropertyOptional({ example: 150, nullable: true, description: 'null lo quita' })
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con hasta 2 decimales' },
  )
  @Min(0, { message: 'El precio no puede ser negativo' })
  precioReferencial?: number | null;
}
