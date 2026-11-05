import { IsIn, IsOptional, IsString } from 'class-validator';
import { IsFechaHoraConZona } from '../../../common/validation/is-fecha-hora-con-zona.decorator';
import type { AppointmentStatus } from '../../appointments/domain/appointment';

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA', 'CANCELADA'];

// Cita que un escenario E2E necesita ya creada, en cualquier estado.
export class CreateE2eAppointmentDto {
  @IsIn(['paciente1', 'paciente2'])
  paciente: 'paciente1' | 'paciente2';

  @IsFechaHoraConZona('horaInicio')
  horaInicio: string;

  @IsOptional()
  @IsIn(ESTADOS)
  estado?: AppointmentStatus;

  @IsOptional()
  @IsString()
  observacion?: string;
}
