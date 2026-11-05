import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsFechaHoraConZona } from '../../../common/validation/is-fecha-hora-con-zona.decorator';

export class CreateBlockDto {
  @ApiProperty({ example: '2026-11-10T14:00:00.000Z' })
  @IsFechaHoraConZona('inicio')
  inicio: string;

  @ApiProperty({ example: '2026-11-10T15:00:00.000Z' })
  @IsFechaHoraConZona('fin')
  fin: string;

  @ApiPropertyOptional({ example: 'Congreso', maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'motivo debe ser un texto' })
  @MaxLength(200, { message: 'motivo admite hasta 200 caracteres' })
  motivo?: string;
}
