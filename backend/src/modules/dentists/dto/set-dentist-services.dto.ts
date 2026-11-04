import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

// Reemplaza la lista completa de servicios que realiza el odontólogo (lista vacía = ninguno).
export class SetDentistServicesDto {
  @ApiProperty({ type: [String], example: [] })
  @IsArray({ message: 'serviceIds debe ser una lista' })
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true, message: 'Cada servicio debe ser un id válido' })
  serviceIds: string[];
}
