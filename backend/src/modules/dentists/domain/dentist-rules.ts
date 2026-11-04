import {
  OdontologoDeshabilitadoError,
  OdontologoNoRealizaServicioError,
} from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { DentistPublicView, DentistRecord } from './dentist';

// Un odontólogo acepta nuevas citas si está habilitado como profesional y su cuenta también.
// Deshabilitarlo no borra ni cancela sus citas históricas (PDF sección 4).
export function aceptaNuevasCitas(d: Pick<DentistRecord, 'activo' | 'cuentaActiva'>): boolean {
  return d.activo && d.cuentaActiva;
}

// La usará el módulo de citas al reservar y reprogramar.
export function assertOdontologoAceptaCitas(
  d: Pick<DentistRecord, 'activo' | 'cuentaActiva'>,
): void {
  if (!aceptaNuevasCitas(d)) {
    throw new OdontologoDeshabilitadoError();
  }
}

// Solo se puede reservar con un odontólogo que realice el servicio elegido (PDF sección 6).
export function realizaServicio(d: Pick<DentistRecord, 'servicios'>, serviceId: string): boolean {
  return d.servicios.some((s) => s.id === serviceId);
}

export function assertRealizaServicio(
  d: Pick<DentistRecord, 'servicios'>,
  serviceId: string,
): void {
  if (!realizaServicio(d, serviceId)) {
    throw new OdontologoNoRealizaServicioError();
  }
}

// El ADMIN ve a todos para gestionarlos; el resto solo a quienes aceptan citas.
export function puedeVerOdontologo(
  role: Role,
  d: Pick<DentistRecord, 'activo' | 'cuentaActiva'>,
): boolean {
  return role === 'ADMIN' || aceptaNuevasCitas(d);
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
      .map(({ id, nombre, duracionMin }) => ({ id, nombre, duracionMin })),
  };
}

// Ids sin repetir, conservando el orden en que llegaron.
export function idsUnicos(ids: string[]): string[] {
  return [...new Set(ids)];
}
