import { IsIn, IsOptional, IsString } from 'class-validator';
import { IsDateTimeWithZone } from '../../../common/validation/is-date-time-with-zone.decorator';
import type { AppointmentStatus } from '../../appointments/domain/appointment';

const STATUSES = ['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA', 'CANCELADA'];

// Cita que un escenario E2E necesita ya creada, en cualquier estado.
export class CreateE2eAppointmentDto {
  @IsIn(['paciente1', 'paciente2'])
  paciente: 'paciente1' | 'paciente2';

  @IsDateTimeWithZone('horaInicio')
  horaInicio: string;

  @IsOptional()
  @IsIn(STATUSES)
  estado?: AppointmentStatus;

  @IsOptional()
  @IsString()
  observacion?: string;
}
