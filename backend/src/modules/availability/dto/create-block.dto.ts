import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// IsISO8601 descarta fechas inexistentes, pero también acepta formatos que Date no entiende (como
// semanas) y fechas sin zona, que se interpretarían en la zona del servidor. Por eso se exige
// además esta forma.
const FECHA_HORA_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const MENSAJE_FECHA = 'debe ser una fecha y hora ISO 8601 con zona horaria';

export class CreateBlockDto {
  @ApiProperty({ example: '2026-11-10T14:00:00.000Z' })
  @IsISO8601({ strict: true }, { message: `inicio ${MENSAJE_FECHA}` })
  @Matches(FECHA_HORA_CON_ZONA, { message: `inicio ${MENSAJE_FECHA}` })
  inicio: string;

  @ApiProperty({ example: '2026-11-10T15:00:00.000Z' })
  @IsISO8601({ strict: true }, { message: `fin ${MENSAJE_FECHA}` })
  @Matches(FECHA_HORA_CON_ZONA, { message: `fin ${MENSAJE_FECHA}` })
  fin: string;

  @ApiPropertyOptional({ example: 'Congreso', maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'motivo debe ser un texto' })
  @MaxLength(200, { message: 'motivo admite hasta 200 caracteres' })
  motivo?: string;
}
