import {
  DentistDisabledError,
  DentistDoesNotOfferServiceError,
} from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { DentistPublicView, DentistRecord } from './dentist';

// Un odontólogo acepta nuevas citas si está habilitado como profesional y su cuenta también.
// Deshabilitarlo no borra ni cancela sus citas históricas (PDF sección 4).
export function acceptsNewAppointments(d: Pick<DentistRecord, 'activo' | 'cuentaActiva'>): boolean {
  return d.activo && d.cuentaActiva;
}

// La usará el módulo de citas al reservar y reprogramar.
export function assertDentistAcceptsAppointments(
  d: Pick<DentistRecord, 'activo' | 'cuentaActiva'>,
): void {
  if (!acceptsNewAppointments(d)) {
    throw new DentistDisabledError();
  }
}

// Solo se puede reservar con un odontólogo que realice el servicio elegido (PDF sección 6).
export function offersService(d: Pick<DentistRecord, 'servicios'>, serviceId: string): boolean {
  return d.servicios.some((s) => s.id === serviceId);
}

export function assertOffersService(d: Pick<DentistRecord, 'servicios'>, serviceId: string): void {
  if (!offersService(d, serviceId)) {
    throw new DentistDoesNotOfferServiceError();
  }
}

// El ADMIN ve a todos para gestionarlos; el resto solo a quienes aceptan citas.
export function canViewDentist(
  role: Role,
  d: Pick<DentistRecord, 'activo' | 'cuentaActiva'>,
): boolean {
  return role === 'ADMIN' || acceptsNewAppointments(d);
}

// Proyección para PACIENTE/ODONTOLOGO: oculta email y estado de la cuenta, y solo lista los
// servicios habilitados (los deshabilitados no se pueden reservar).
export function toPublicView(d: DentistRecord): DentistPublicView {
  return {
    id: d.id,
    nombre: d.nombre,
    especialidad: d.especialidad,
    servicios: d.servicios
      .filter((s) => s.activo)
      .map(({ id, nombre: name, duracionMin: durationMin }) => ({
        id,
        nombre: name,
        duracionMin: durationMin,
      })),
  };
}

// Ids sin repetir, conservando el orden en que llegaron.
export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
