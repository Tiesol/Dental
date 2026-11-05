import { AppointmentView } from '../../appointments/domain/appointment';

export function assertPuedeRegistrarObservacion(
  _cita: Pick<AppointmentView, 'estado' | 'observacion'>,
): void {
  throw new Error('sin implementar');
}
