import {
  AccesoDenegadoError,
  ObservacionRequeridaError,
  TransicionDeEstadoInvalidaError,
} from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { AppointmentStatus } from './appointment';

// Máquina de estados de la cita (ARQUITECTURA.md sección 6). Una transición que no está aquí no
// existe, para nadie: FINALIZADA y CANCELADA son terminales.
const TRANSICIONES: { desde: AppointmentStatus; hacia: AppointmentStatus; roles: Role[] }[] = [
  { desde: 'PENDIENTE', hacia: 'CONFIRMADA', roles: ['ADMIN'] },
  { desde: 'CONFIRMADA', hacia: 'EN_ATENCION', roles: ['ODONTOLOGO'] },
  { desde: 'EN_ATENCION', hacia: 'FINALIZADA', roles: ['ODONTOLOGO'] },
  { desde: 'PENDIENTE', hacia: 'CANCELADA', roles: ['PACIENTE', 'ADMIN'] },
  { desde: 'CONFIRMADA', hacia: 'CANCELADA', roles: ['PACIENTE', 'ADMIN'] },
];

export function assertTransicionPermitida(
  desde: AppointmentStatus,
  hacia: AppointmentStatus,
  rol: Role,
): void {
  const transicion = TRANSICIONES.find((t) => t.desde === desde && t.hacia === hacia);
  if (!transicion) {
    throw new TransicionDeEstadoInvalidaError(desde, hacia);
  }
  if (!transicion.roles.includes(rol)) {
    throw new AccesoDenegadoError('Tu rol no puede realizar este cambio de estado');
  }
}

// Finalizar exige la observación de atención ya registrada (PDF sección 7).
export function assertPuedeFinalizar(
  hacia: AppointmentStatus,
  observacion: { texto: string } | null,
): void {
  if (hacia === 'FINALIZADA' && !observacion) {
    throw new ObservacionRequeridaError();
  }
}
