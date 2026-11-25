import type { AppointmentStatus, Role } from '@/api/types';

export type AppointmentAction =
  | 'reprogramar'
  | 'cancelar'
  | 'confirmar'
  | 'iniciar-atencion'
  | 'registrar-observacion'
  | 'finalizar';

// Único lugar que decide cómo se ve cada estado y qué acciones ofrece por rol (ARQUITECTURA.md
// sección 7). Solo refleja las reglas: la decisión final es del backend.
const STATUSES: Record<
  AppointmentStatus,
  { label: string; cssClass: string; actions: Record<Role, AppointmentAction[]> }
> = {
  PENDIENTE: {
    label: 'PENDIENTE',
    cssClass: 'badge-pendiente',
    actions: {
      PACIENTE: ['reprogramar', 'cancelar'],
      ODONTOLOGO: ['confirmar'],
      ADMIN: ['confirmar', 'cancelar'],
    },
  },
  CONFIRMADA: {
    label: 'CONFIRMADA',
    cssClass: 'badge-confirmada',
    actions: {
      PACIENTE: ['reprogramar', 'cancelar'],
      ODONTOLOGO: ['iniciar-atencion'],
      ADMIN: ['cancelar'],
    },
  },
  EN_ATENCION: {
    label: 'EN ATENCIÓN',
    cssClass: 'badge-en-atencion',
    actions: {
      PACIENTE: [],
      ODONTOLOGO: ['registrar-observacion', 'finalizar'],
      ADMIN: [],
    },
  },
  FINALIZADA: {
    label: 'FINALIZADA',
    cssClass: 'badge-ok',
    actions: { PACIENTE: [], ODONTOLOGO: [], ADMIN: [] },
  },
  CANCELADA: {
    label: 'CANCELADA',
    cssClass: 'badge-off',
    actions: { PACIENTE: [], ODONTOLOGO: [], ADMIN: [] },
  },
};

export function statusLabel(status: AppointmentStatus): string {
  return STATUSES[status].label;
}

export function statusClass(status: AppointmentStatus): string {
  return STATUSES[status].cssClass;
}

export function allowedActions(status: AppointmentStatus, role: Role): AppointmentAction[] {
  return STATUSES[status].actions[role];
}
