import { describe, expect, it, vi } from 'vitest';
import {
  dateInClinic,
  localDateTimeToIso,
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeRange,
  timeToMinutes,
  todayInClinic,
  minutesToTime,
} from './dates';

describe('minutesToTime', () => {
  it.each([
    [0, '00:00'],
    [540, '09:00'],
    [725, '12:05'],
    [1439, '23:59'],
  ])('%i minutos son las %s', (minutes, time) => {
    expect(minutesToTime(minutes)).toBe(time);
  });
});

describe('timeToMinutes', () => {
  it.each([
    ['00:00', 0],
    ['09:00', 540],
    ['12:05', 725],
  ])('%s son %i minutos', (time, minutes) => {
    expect(timeToMinutes(time)).toBe(minutes);
  });
});

describe('localDateTimeToIso', () => {
  it('interpreta la fecha y hora en la zona de la clínica y la devuelve en UTC', () => {
    expect(localDateTimeToIso('2026-11-10T10:00')).toBe('2026-11-10T14:00:00.000Z');
  });

  it('cambia de día en UTC si es de noche en la clínica', () => {
    expect(localDateTimeToIso('2026-11-10T22:30')).toBe('2026-11-11T02:30:00.000Z');
  });
});

describe('formatos en la zona de la clínica', () => {
  it('muestra la hora local de un instante UTC', () => {
    expect(formatTime('2026-11-10T13:00:00.000Z')).toBe('09:00');
  });

  it('muestra un rango de horas', () => {
    expect(formatTimeRange('2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z')).toBe(
      '09:00 - 09:30',
    );
  });

  it('usa la fecha de la clínica aunque en UTC ya sea el día siguiente', () => {
    expect(formatDate('2026-11-11T02:00:00.000Z')).toBe('martes, 10 de noviembre de 2026');
  });

  it('muestra fecha y hora juntas', () => {
    expect(formatDateTime('2026-11-10T13:00:00.000Z')).toBe(
      'martes, 10 de noviembre de 2026, 09:00',
    );
  });
});

describe('dateInClinic', () => {
  it('devuelve el día de la clínica aunque en UTC ya sea el siguiente', () => {
    expect(dateInClinic('2026-11-11T02:00:00.000Z')).toBe('2026-11-10');
  });
});

describe('todayInClinic', () => {
  it('devuelve la fecha de la clínica, no la de UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T02:00:00.000Z'));

    const today = todayInClinic();

    vi.useRealTimers();
    expect(today).toBe('2026-11-10');
  });
});
