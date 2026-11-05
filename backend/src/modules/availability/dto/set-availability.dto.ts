import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, ValidateNested } from 'class-validator';

// Aquí solo se valida la forma; los rangos y los solapamientos son reglas del dominio.
export class AvailabilityRuleDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6, description: '0 = domingo ... 6 = sábado' })
  @IsInt({ message: 'diaSemana debe ser un número entero' })
  diaSemana: number;

  @ApiProperty({
    example: 540,
    minimum: 0,
    maximum: 1440,
    description: 'Minutos desde las 00:00 en la zona de la clínica (09:00 = 540)',
  })
  @IsInt({ message: 'minutoInicio debe ser un número entero' })
  minutoInicio: number;

  @ApiProperty({ example: 720, minimum: 0, maximum: 1440 })
  @IsInt({ message: 'minutoFin debe ser un número entero' })
  minutoFin: number;
}

export class SetAvailabilityDto {
  @ApiProperty({
    type: [AvailabilityRuleDto],
    description: 'Reemplaza todos los horarios. Un horario partido son dos tramos.',
  })
  @IsArray({ message: 'horarios debe ser una lista' })
  @ArrayMaxSize(100, { message: 'horarios admite hasta 100 tramos' })
  @ValidateNested({ each: true, message: 'Cada horario debe ser un objeto' })
  @Type(() => AvailabilityRuleDto)
  horarios: AvailabilityRuleDto[];
}
