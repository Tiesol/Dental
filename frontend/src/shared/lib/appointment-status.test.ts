import { describe, expect, it } from 'vitest';
import type { AppointmentStatus, Role } from '@/api/types';
import {
  allowedActions,
  statusClass,
  statusLabel,
  type AppointmentAction,
} from './appointment-status';

describe('statusLabel', () => {
  it.each([
    ['PENDIENTE', 'PENDIENTE'],
    ['CONFIRMADA', 'CONFIRMADA'],
    ['EN_ATENCION', 'EN ATENCIÓN'],
    ['FINALIZADA', 'FINALIZADA'],
    ['CANCELADA', 'CANCELADA'],
  ] as const)('%s se muestra con el texto exacto del PDF', (status, text) => {
    expect(statusLabel(status)).toBe(text);
  });
});

describe('statusClass', () => {
  it.each([
    ['PENDIENTE', 'badge-pendiente'],
    ['CONFIRMADA', 'badge-confirmada'],
    ['EN_ATENCION', 'badge-en-atencion'],
    ['FINALIZADA', 'badge-ok'],
    ['CANCELADA', 'badge-off'],
  ] as const)('%s usa la clase %s', (status, cssClass) => {
    expect(statusClass(status)).toBe(cssClass);
  });
});

// La tabla de ARQUITECTURA.md sección 7.
const TABLE: [AppointmentStatus, Role, AppointmentAction[]][] = [
  ['PENDIENTE', 'PACIENTE', ['reprogramar', 'cancelar']],
  ['PENDIENTE', 'ODONTOLOGO', ['confirmar']],
  ['PENDIENTE', 'ADMIN', ['confirmar', 'cancelar']],
  ['CONFIRMADA', 'PACIENTE', ['reprogramar', 'cancelar']],
  ['CONFIRMADA', 'ODONTOLOGO', ['iniciar-atencion']],
  ['CONFIRMADA', 'ADMIN', ['cancelar']],
  ['EN_ATENCION', 'PACIENTE', []],
  ['EN_ATENCION', 'ODONTOLOGO', ['registrar-observacion', 'finalizar']],
  ['EN_ATENCION', 'ADMIN', []],
  ['FINALIZADA', 'PACIENTE', []],
  ['FINALIZADA', 'ODONTOLOGO', []],
  ['FINALIZADA', 'ADMIN', []],
  ['CANCELADA', 'PACIENTE', []],
  ['CANCELADA', 'ODONTOLOGO', []],
  ['CANCELADA', 'ADMIN', []],
];

describe('allowedActions', () => {
  it.each(TABLE)('una cita %s para %s permite %j', (status, role, actions) => {
    expect(allowedActions(status, role)).toEqual(actions);
  });
});
