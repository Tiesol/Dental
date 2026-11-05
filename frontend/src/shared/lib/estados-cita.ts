import type { EstadoCita, Role } from '@/api/types';

export type AccionCita =
  | 'reprogramar'
  | 'cancelar'
  | 'confirmar'
  | 'iniciar-atencion'
  | 'registrar-observacion'
  | 'finalizar';

export function etiquetaEstado(_estado: EstadoCita): string {
  throw new Error('sin implementar');
}

export function claseEstado(_estado: EstadoCita): string {
  throw new Error('sin implementar');
}

export function accionesPermitidas(_estado: EstadoCita, _rol: Role): AccionCita[] {
  throw new Error('sin implementar');
}
