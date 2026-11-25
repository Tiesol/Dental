import {
  AccessDeniedError,
  ObservationRequiredError,
  InvalidStatusTransitionError,
} from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { AppointmentStatus } from './appointment';

// Máquina de estados de la cita (ARQUITECTURA.md sección 6). Una transición que no está aquí no
// existe, para nadie: FINALIZADA y CANCELADA son terminales.
const TRANSITIONS: { from: AppointmentStatus; to: AppointmentStatus; roles: Role[] }[] = [
  { from: 'PENDIENTE', to: 'CONFIRMADA', roles: ['ODONTOLOGO', 'ADMIN'] },
  { from: 'CONFIRMADA', to: 'EN_ATENCION', roles: ['ODONTOLOGO'] },
  { from: 'EN_ATENCION', to: 'FINALIZADA', roles: ['ODONTOLOGO'] },
  { from: 'PENDIENTE', to: 'CANCELADA', roles: ['PACIENTE', 'ADMIN'] },
  { from: 'CONFIRMADA', to: 'CANCELADA', roles: ['PACIENTE', 'ADMIN'] },
];

export function assertTransitionAllowed(
  from: AppointmentStatus,
  to: AppointmentStatus,
  role: Role,
): void {
  const transition = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!transition) {
    throw new InvalidStatusTransitionError(from, to);
  }
  if (!transition.roles.includes(role)) {
    throw new AccessDeniedError('Tu rol no puede realizar este cambio de estado');
  }
}

// Finalizar exige la observación de atención ya registrada (PDF sección 7).
export function assertCanFinish(
  to: AppointmentStatus,
  observation: { texto: string } | null,
): void {
  if (to === 'FINALIZADA' && !observation) {
    throw new ObservationRequiredError();
  }
}
