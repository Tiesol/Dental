import { describe, expect, it } from 'vitest';
import type { EstadoCita, Role } from '@/api/types';
import { accionesPermitidas, claseEstado, etiquetaEstado, type AccionCita } from './estados-cita';

describe('etiquetaEstado', () => {
  it.each([
    ['PENDIENTE', 'PENDIENTE'],
    ['CONFIRMADA', 'CONFIRMADA'],
    ['EN_ATENCION', 'EN ATENCIÓN'],
    ['FINALIZADA', 'FINALIZADA'],
    ['CANCELADA', 'CANCELADA'],
  ] as const)('%s se muestra con el texto exacto del PDF', (estado, texto) => {
    expect(etiquetaEstado(estado)).toBe(texto);
  });
});

describe('claseEstado', () => {
  it.each([
    ['PENDIENTE', 'badge-pendiente'],
    ['CONFIRMADA', 'badge-confirmada'],
    ['EN_ATENCION', 'badge-en-atencion'],
    ['FINALIZADA', 'badge-ok'],
    ['CANCELADA', 'badge-off'],
  ] as const)('%s usa la clase %s', (estado, clase) => {
    expect(claseEstado(estado)).toBe(clase);
  });
});

// La tabla de ARQUITECTURA.md sección 7.
const TABLA: [EstadoCita, Role, AccionCita[]][] = [
  ['PENDIENTE', 'PACIENTE', ['reprogramar', 'cancelar']],
  ['PENDIENTE', 'ODONTOLOGO', []],
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

describe('accionesPermitidas', () => {
  it.each(TABLA)('una cita %s para %s permite %j', (estado, rol, acciones) => {
    expect(accionesPermitidas(estado, rol)).toEqual(acciones);
  });
});
