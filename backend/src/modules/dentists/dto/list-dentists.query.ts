import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListDentistsQuery {
  @ApiPropertyOptional({ description: 'Solo odontólogos que realizan este servicio' })
  @IsOptional()
  @IsUUID('all', { message: 'serviceId debe ser un id válido' })
  serviceId?: string;
}
