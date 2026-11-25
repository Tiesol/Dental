import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsDateTimeWithZone } from '../../../common/validation/is-date-time-with-zone.decorator';

// El cliente nunca envía horaFin, estado ni patientId: se derivan en el servidor.
export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID('all', { message: 'dentistId debe ser un id válido' })
  dentistId: string;

  @ApiProperty()
  @IsUUID('all', { message: 'serviceId debe ser un id válido' })
  serviceId: string;

  @ApiProperty({ example: '2026-11-10T13:00:00.000Z' })
  @IsDateTimeWithZone('horaInicio')
  horaInicio: string;
}
