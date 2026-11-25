import { ApiProperty } from '@nestjs/swagger';
import { IsDateTimeWithZone } from '../../../common/validation/is-date-time-with-zone.decorator';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-11-10T14:00:00.000Z' })
  @IsDateTimeWithZone('horaInicio')
  horaInicio: string;
}
