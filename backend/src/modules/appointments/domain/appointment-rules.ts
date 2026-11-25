import {
  AppointmentAccessDeniedError,
  AppointmentNotModifiableError,
  SlotInThePastError,
  SlotUnavailableError,
} from '../../../common/errors/domain-error';
import { CurrentUserData } from '../../../common/types/current-user';
import { AppointmentStatus, AppointmentView, AppointmentWhen } from './appointment';
import { Interval } from './overlap';

// Validación antes de confirmar una reserva: la hora elegida debe ser uno de los horarios
// disponibles, calculados con la misma definición que ve el paciente (PDF sección 6).
export function assertSlotBookable(startsAt: Date, slots: Interval[], now: Date): void {
  if (startsAt < now) {
    throw new SlotInThePastError();
  }
  if (!slots.some((slot) => slot.inicio.getTime() === startsAt.getTime())) {
    throw new SlotUnavailableError();
  }
}

// La ven el paciente dueño, el odontólogo asignado y el ADMIN. El resto recibe 403, no 404
// (E2E 07 del PDF).
export function assertCanViewAppointment(
  appointment: Pick<AppointmentView, 'paciente' | 'odontologo'>,
  user: Pick<CurrentUserData, 'role' | 'patientId' | 'dentistId'>,
): void {
  const allowed =
    user.role === 'ADMIN' ||
    (user.role === 'PACIENTE' && appointment.paciente.id === user.patientId) ||
    (user.role === 'ODONTOLOGO' && appointment.odontologo.id === user.dentistId);
  if (!allowed) {
    throw new AppointmentAccessDeniedError();
  }
}

// Próxima: no ha empezado y no está FINALIZADA ni CANCELADA.
function isUpcoming(
  appointment: Pick<AppointmentView, 'horaInicio' | 'estado'>,
  now: Date,
): boolean {
  return (
    appointment.horaInicio > now &&
    appointment.estado !== 'FINALIZADA' &&
    appointment.estado !== 'CANCELADA'
  );
}

// Próximas de la más cercana a la más lejana; historial y sin filtro, de la más reciente a la
// más antigua.
export function filterByWhen<T extends Pick<AppointmentView, 'horaInicio' | 'estado'>>(
  appointments: T[],
  when: AppointmentWhen | undefined,
  now: Date,
): T[] {
  const byStart = (a: T, b: T) => a.horaInicio.getTime() - b.horaInicio.getTime();
  if (when === 'proximas') {
    return appointments.filter((appointment) => isUpcoming(appointment, now)).sort(byStart);
  }
  const chosen =
    when === 'historial'
      ? appointments.filter((appointment) => !isUpcoming(appointment, now))
      : [...appointments];
  return chosen.sort((a, b) => byStart(b, a));
}

// Solo se reprograma o cancela antes de la atención (PDF sección 8 y D1 de PLAN.md).
export function assertAppointmentModifiable(status: AppointmentStatus): void {
  if (status !== 'PENDIENTE' && status !== 'CONFIRMADA') {
    throw new AppointmentNotModifiableError();
  }
}
