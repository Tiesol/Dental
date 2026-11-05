import { ApiProperty } from '@nestjs/swagger';
import { IsFechaHoraConZona } from '../../../common/validation/is-fecha-hora-con-zona.decorator';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-11-10T14:00:00.000Z' })
  @IsFechaHoraConZona('horaInicio')
  horaInicio: string;
}
