import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AgendaQuery {
  // Aquí solo se exige un texto; que la fecha exista lo valida el dominio (FechaInvalidaError).
  @ApiPropertyOptional({ example: '2026-11-10', description: 'Hoy en la clínica, por defecto' })
  @IsOptional()
  @IsString({ message: 'fecha debe ser un texto con formato YYYY-MM-DD' })
  fecha?: string;
}

export class UpcomingAgendaQuery {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit admite hasta 100' })
  limit: number = 50;
}
