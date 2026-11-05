import {
  AccesoDenegadoACitaError,
  HorarioEnElPasadoError,
  HorarioNoDisponibleError,
} from '../../../common/errors/domain-error';
import { CurrentUserData } from '../../../common/types/current-user';
import { AppointmentView, CuandoCitas } from './appointment';
import { Intervalo } from './overlap';

// Validación antes de confirmar una reserva: la hora elegida debe ser uno de los horarios
// disponibles, calculados con la misma definición que ve el paciente (PDF sección 6).
export function assertHorarioReservable(horaInicio: Date, slots: Intervalo[], ahora: Date): void {
  if (horaInicio < ahora) {
    throw new HorarioEnElPasadoError();
  }
  if (!slots.some((slot) => slot.inicio.getTime() === horaInicio.getTime())) {
    throw new HorarioNoDisponibleError();
  }
}

// La ven el paciente dueño, el odontólogo asignado y el ADMIN. El resto recibe 403, no 404
// (E2E 07 del PDF).
export function assertPuedeVerCita(
  cita: Pick<AppointmentView, 'paciente' | 'odontologo'>,
  user: Pick<CurrentUserData, 'role' | 'patientId' | 'dentistId'>,
): void {
  const puede =
    user.role === 'ADMIN' ||
    (user.role === 'PACIENTE' && cita.paciente.id === user.patientId) ||
    (user.role === 'ODONTOLOGO' && cita.odontologo.id === user.dentistId);
  if (!puede) {
    throw new AccesoDenegadoACitaError();
  }
}

// Próxima: no ha empezado y no está FINALIZADA ni CANCELADA.
function esProxima(cita: Pick<AppointmentView, 'horaInicio' | 'estado'>, ahora: Date): boolean {
  return cita.horaInicio > ahora && cita.estado !== 'FINALIZADA' && cita.estado !== 'CANCELADA';
}

// Próximas de la más cercana a la más lejana; historial y sin filtro, de la más reciente a la
// más antigua.
export function filtrarPorCuando<T extends Pick<AppointmentView, 'horaInicio' | 'estado'>>(
  citas: T[],
  cuando: CuandoCitas | undefined,
  ahora: Date,
): T[] {
  const porInicio = (a: T, b: T) => a.horaInicio.getTime() - b.horaInicio.getTime();
  if (cuando === 'proximas') {
    return citas.filter((cita) => esProxima(cita, ahora)).sort(porInicio);
  }
  const elegidas =
    cuando === 'historial' ? citas.filter((cita) => !esProxima(cita, ahora)) : [...citas];
  return elegidas.sort((a, b) => porInicio(b, a));
}
