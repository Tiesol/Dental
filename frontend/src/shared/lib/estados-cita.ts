import type { EstadoCita, Role } from '@/api/types';

export type AccionCita =
  | 'reprogramar'
  | 'cancelar'
  | 'confirmar'
  | 'iniciar-atencion'
  | 'registrar-observacion'
  | 'finalizar';

// Único lugar que decide cómo se ve cada estado y qué acciones ofrece por rol (ARQUITECTURA.md
// sección 7). Solo refleja las reglas: la decisión final es del backend.
const ESTADOS: Record<
  EstadoCita,
  { etiqueta: string; clase: string; acciones: Record<Role, AccionCita[]> }
> = {
  PENDIENTE: {
    etiqueta: 'PENDIENTE',
    clase: 'badge-pendiente',
    acciones: {
      PACIENTE: ['reprogramar', 'cancelar'],
      ODONTOLOGO: [],
      ADMIN: ['confirmar', 'cancelar'],
    },
  },
  CONFIRMADA: {
    etiqueta: 'CONFIRMADA',
    clase: 'badge-confirmada',
    acciones: {
      PACIENTE: ['reprogramar', 'cancelar'],
      ODONTOLOGO: ['iniciar-atencion'],
      ADMIN: ['cancelar'],
    },
  },
  EN_ATENCION: {
    etiqueta: 'EN ATENCIÓN',
    clase: 'badge-en-atencion',
    acciones: {
      PACIENTE: [],
      ODONTOLOGO: ['registrar-observacion', 'finalizar'],
      ADMIN: [],
    },
  },
  FINALIZADA: {
    etiqueta: 'FINALIZADA',
    clase: 'badge-ok',
    acciones: { PACIENTE: [], ODONTOLOGO: [], ADMIN: [] },
  },
  CANCELADA: {
    etiqueta: 'CANCELADA',
    clase: 'badge-off',
    acciones: { PACIENTE: [], ODONTOLOGO: [], ADMIN: [] },
  },
};

export function etiquetaEstado(estado: EstadoCita): string {
  return ESTADOS[estado].etiqueta;
}

export function claseEstado(estado: EstadoCita): string {
  return ESTADOS[estado].clase;
}

export function accionesPermitidas(estado: EstadoCita, rol: Role): AccionCita[] {
  return ESTADOS[estado].acciones[rol];
}
