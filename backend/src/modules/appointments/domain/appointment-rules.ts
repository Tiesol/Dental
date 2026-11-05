import { CurrentUserData } from '../../../common/types/current-user';
import { AppointmentView, CuandoCitas } from './appointment';
import { Intervalo } from './overlap';

export function assertHorarioReservable(
  _horaInicio: Date,
  _slots: Intervalo[],
  _ahora: Date,
): void {
  throw new Error('sin implementar');
}

export function assertPuedeVerCita(
  _cita: Pick<AppointmentView, 'paciente' | 'odontologo'>,
  _user: Pick<CurrentUserData, 'role' | 'patientId' | 'dentistId'>,
): void {
  throw new Error('sin implementar');
}

export function filtrarPorCuando<T extends Pick<AppointmentView, 'horaInicio' | 'estado'>>(
  _citas: T[],
  _cuando: CuandoCitas | undefined,
  _ahora: Date,
): T[] {
  throw new Error('sin implementar');
}
