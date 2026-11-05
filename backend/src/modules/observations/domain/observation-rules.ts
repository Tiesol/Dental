import {
  CitaNoEnAtencionError,
  ObservacionYaRegistradaError,
} from '../../../common/errors/domain-error';
import { AppointmentView } from '../../appointments/domain/appointment';

// La observación se registra durante la atención y una sola vez (D5 de PLAN.md).
export function assertPuedeRegistrarObservacion(
  cita: Pick<AppointmentView, 'estado' | 'observacion'>,
): void {
  if (cita.estado !== 'EN_ATENCION') {
    throw new CitaNoEnAtencionError();
  }
  if (cita.observacion) {
    throw new ObservacionYaRegistradaError();
  }
}
