import { describe, expect, it, vi } from 'vitest';
import {
  fechaEnClinica,
  fechaHoraLocalAIso,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  formatearRangoHora,
  horaAMinutos,
  hoyEnClinica,
  minutosAHora,
} from './dates';

describe('minutosAHora', () => {
  it.each([
    [0, '00:00'],
    [540, '09:00'],
    [725, '12:05'],
    [1439, '23:59'],
  ])('%i minutos son las %s', (minutos, hora) => {
    expect(minutosAHora(minutos)).toBe(hora);
  });
});

describe('horaAMinutos', () => {
  it.each([
    ['00:00', 0],
    ['09:00', 540],
    ['12:05', 725],
  ])('%s son %i minutos', (hora, minutos) => {
    expect(horaAMinutos(hora)).toBe(minutos);
  });
});

describe('fechaHoraLocalAIso', () => {
  it('interpreta la fecha y hora en la zona de la clínica y la devuelve en UTC', () => {
    expect(fechaHoraLocalAIso('2026-11-10T10:00')).toBe('2026-11-10T14:00:00.000Z');
  });

  it('cambia de día en UTC si es de noche en la clínica', () => {
    expect(fechaHoraLocalAIso('2026-11-10T22:30')).toBe('2026-11-11T02:30:00.000Z');
  });
});

describe('formatos en la zona de la clínica', () => {
  it('muestra la hora local de un instante UTC', () => {
    expect(formatearHora('2026-11-10T13:00:00.000Z')).toBe('09:00');
  });

  it('muestra un rango de horas', () => {
    expect(formatearRangoHora('2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z')).toBe(
      '09:00 - 09:30',
    );
  });

  it('usa la fecha de la clínica aunque en UTC ya sea el día siguiente', () => {
    expect(formatearFecha('2026-11-11T02:00:00.000Z')).toBe('martes, 10 de noviembre de 2026');
  });

  it('muestra fecha y hora juntas', () => {
    expect(formatearFechaHora('2026-11-10T13:00:00.000Z')).toBe(
      'martes, 10 de noviembre de 2026, 09:00',
    );
  });
});

describe('fechaEnClinica', () => {
  it('devuelve el día de la clínica aunque en UTC ya sea el siguiente', () => {
    expect(fechaEnClinica('2026-11-11T02:00:00.000Z')).toBe('2026-11-10');
  });
});

describe('hoyEnClinica', () => {
  it('devuelve la fecha de la clínica, no la de UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T02:00:00.000Z'));

    const hoy = hoyEnClinica();

    vi.useRealTimers();
    expect(hoy).toBe('2026-11-10');
  });
});
