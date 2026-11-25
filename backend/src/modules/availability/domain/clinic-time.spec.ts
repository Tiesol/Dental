import { InvalidDateError } from '../../../common/errors/domain-error';
import { assertValidDate, weekdayOf, dateInZone, dayRange, dayTimeRanges } from './clinic-time';

const LA_PAZ = 'America/La_Paz'; // UTC-4 todo el año.
const NEW_YORK = 'America/New_York'; // Cambia de horario: 2026-11-01 pasa de UTC-4 a UTC-5.

describe('assertValidDate', () => {
  it.each(['2026-11-10', '2028-02-29'])('acepta la fecha %s', (date) => {
    expect(() => assertValidDate(date)).not.toThrow();
  });

  it.each([
    ['que no existe', '2026-02-30'],
    ['de un año no bisiesto', '2026-02-29'],
    ['con mes inválido', '2026-13-01'],
    ['de un año fuera de rango', '9999-12-31'],
    ['con otro formato', '10/11/2026'],
    ['sin ceros a la izquierda', '2026-1-5'],
    ['con hora', '2026-11-10T10:00:00Z'],
    ['vacía', ''],
    ['de texto', 'mañana'],
  ])('rechaza una fecha %s', (_testCase, date) => {
    expect(() => assertValidDate(date)).toThrow(InvalidDateError);
  });
});

describe('weekdayOf', () => {
  it.each([
    ['2026-11-08', 0],
    ['2026-11-09', 1],
    ['2026-11-14', 6],
  ])('%s es el día %i', (date, day) => {
    expect(weekdayOf(date)).toBe(day);
  });
});

describe('dayTimeRanges', () => {
  it('convierte los minutos de la clínica a instantes UTC', () => {
    const schedule = [{ diaSemana: 2, minutoInicio: 540, minutoFin: 720 }];

    const timeRanges = dayTimeRanges('2026-11-10', schedule, LA_PAZ);

    expect(timeRanges).toEqual([
      { inicio: new Date('2026-11-10T13:00:00.000Z'), fin: new Date('2026-11-10T16:00:00.000Z') },
    ]);
  });

  it('cambia de día al pasar a UTC si el tramo termina de noche en la clínica', () => {
    const schedule = [{ diaSemana: 2, minutoInicio: 1200, minutoFin: 1320 }];

    const timeRanges = dayTimeRanges('2026-11-10', schedule, LA_PAZ);

    expect(timeRanges).toEqual([
      { inicio: new Date('2026-11-11T00:00:00.000Z'), fin: new Date('2026-11-11T02:00:00.000Z') },
    ]);
  });

  it('interpreta el minuto 1440 como la medianoche del día siguiente', () => {
    const schedule = [{ diaSemana: 2, minutoInicio: 1380, minutoFin: 1440 }];

    const [timeRange] = dayTimeRanges('2026-11-10', schedule, LA_PAZ);

    expect(timeRange.fin).toEqual(new Date('2026-11-11T04:00:00.000Z'));
  });

  it('usa el desfase vigente ese día en una zona con cambio de horario', () => {
    const schedule = [{ diaSemana: 6, minutoInicio: 540, minutoFin: 600 }];

    const [before] = dayTimeRanges('2026-10-31', schedule, NEW_YORK);
    const [after] = dayTimeRanges('2026-11-07', schedule, NEW_YORK);

    expect(before.inicio).toEqual(new Date('2026-10-31T13:00:00.000Z'));
    expect(after.inicio).toEqual(new Date('2026-11-07T14:00:00.000Z'));
  });
});

describe('dayRange', () => {
  it('va de medianoche a medianoche en la zona de la clínica', () => {
    expect(dayRange('2026-11-10', LA_PAZ)).toEqual({
      inicio: new Date('2026-11-10T04:00:00.000Z'),
      fin: new Date('2026-11-11T04:00:00.000Z'),
    });
  });
});

describe('dateInZone', () => {
  it('da la fecha de la clínica aunque en UTC ya sea el día siguiente', () => {
    expect(dateInZone(new Date('2026-11-11T02:00:00.000Z'), LA_PAZ)).toBe('2026-11-10');
  });

  it('da la misma fecha que UTC durante el día', () => {
    expect(dateInZone(new Date('2026-11-10T14:00:00.000Z'), LA_PAZ)).toBe('2026-11-10');
  });
});
