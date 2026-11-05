import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateObservationDto {
  @ApiProperty({ example: 'Limpieza sin complicaciones', minLength: 1, maxLength: 2000 })
  @IsString({ message: 'texto debe ser un texto' })
  @Matches(/\S/, { message: 'La observación no puede estar vacía' })
  @MaxLength(2000, { message: 'La observación admite hasta 2000 caracteres' })
  texto: string;
}
