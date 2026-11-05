import { Role } from '../../../common/types/role';
import { AppointmentStatus } from './appointment';

export function assertTransicionPermitida(
  _desde: AppointmentStatus,
  _hacia: AppointmentStatus,
  _rol: Role,
): void {
  throw new Error('sin implementar');
}

export function assertPuedeFinalizar(
  _hacia: AppointmentStatus,
  _observacion: { texto: string } | null,
): void {
  throw new Error('sin implementar');
}
