import {
  AppointmentNotInProgressError,
  ObservationAlreadyRegisteredError,
} from '../../../common/errors/domain-error';
import { AppointmentView } from '../../appointments/domain/appointment';

// La observación se registra durante la atención y una sola vez (D5 de PLAN.md).
export function assertCanRegisterObservation(
  appointment: Pick<AppointmentView, 'estado' | 'observacion'>,
): void {
  if (appointment.estado !== 'EN_ATENCION') {
    throw new AppointmentNotInProgressError();
  }
  if (appointment.observacion) {
    throw new ObservationAlreadyRegisteredError();
  }
}
