import { FechaInvalidaError } from '../../../common/errors/domain-error';
import {
  assertFechaValida,
  diaSemanaDe,
  fechaEnZona,
  rangoDelDia,
  tramosDelDia,
} from './clinic-time';

const LA_PAZ = 'America/La_Paz'; // UTC-4 todo el año.
const NUEVA_YORK = 'America/New_York'; // Cambia de horario: 2026-11-01 pasa de UTC-4 a UTC-5.

describe('assertFechaValida', () => {
  it.each(['2026-11-10', '2028-02-29'])('acepta la fecha %s', (fecha) => {
    expect(() => assertFechaValida(fecha)).not.toThrow();
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
  ])('rechaza una fecha %s', (_caso, fecha) => {
    expect(() => assertFechaValida(fecha)).toThrow(FechaInvalidaError);
  });
});

describe('diaSemanaDe', () => {
  it.each([
    ['2026-11-08', 0],
    ['2026-11-09', 1],
    ['2026-11-14', 6],
  ])('%s es el día %i', (fecha, dia) => {
    expect(diaSemanaDe(fecha)).toBe(dia);
  });
});

describe('tramosDelDia', () => {
  it('convierte los minutos de la clínica a instantes UTC', () => {
    const horarios = [{ diaSemana: 2, minutoInicio: 540, minutoFin: 720 }];

    const tramos = tramosDelDia('2026-11-10', horarios, LA_PAZ);

    expect(tramos).toEqual([
      { inicio: new Date('2026-11-10T13:00:00.000Z'), fin: new Date('2026-11-10T16:00:00.000Z') },
    ]);
  });

  it('cambia de día al pasar a UTC si el tramo termina de noche en la clínica', () => {
    const horarios = [{ diaSemana: 2, minutoInicio: 1200, minutoFin: 1320 }];

    const tramos = tramosDelDia('2026-11-10', horarios, LA_PAZ);

    expect(tramos).toEqual([
      { inicio: new Date('2026-11-11T00:00:00.000Z'), fin: new Date('2026-11-11T02:00:00.000Z') },
    ]);
  });

  it('interpreta el minuto 1440 como la medianoche del día siguiente', () => {
    const horarios = [{ diaSemana: 2, minutoInicio: 1380, minutoFin: 1440 }];

    const [tramo] = tramosDelDia('2026-11-10', horarios, LA_PAZ);

    expect(tramo.fin).toEqual(new Date('2026-11-11T04:00:00.000Z'));
  });

  it('usa el desfase vigente ese día en una zona con cambio de horario', () => {
    const horarios = [{ diaSemana: 6, minutoInicio: 540, minutoFin: 600 }];

    const [antes] = tramosDelDia('2026-10-31', horarios, NUEVA_YORK);
    const [despues] = tramosDelDia('2026-11-07', horarios, NUEVA_YORK);

    expect(antes.inicio).toEqual(new Date('2026-10-31T13:00:00.000Z'));
    expect(despues.inicio).toEqual(new Date('2026-11-07T14:00:00.000Z'));
  });
});

describe('rangoDelDia', () => {
  it('va de medianoche a medianoche en la zona de la clínica', () => {
    expect(rangoDelDia('2026-11-10', LA_PAZ)).toEqual({
      inicio: new Date('2026-11-10T04:00:00.000Z'),
      fin: new Date('2026-11-11T04:00:00.000Z'),
    });
  });
});

describe('fechaEnZona', () => {
  it('da la fecha de la clínica aunque en UTC ya sea el día siguiente', () => {
    expect(fechaEnZona(new Date('2026-11-11T02:00:00.000Z'), LA_PAZ)).toBe('2026-11-10');
  });

  it('da la misma fecha que UTC durante el día', () => {
    expect(fechaEnZona(new Date('2026-11-10T14:00:00.000Z'), LA_PAZ)).toBe('2026-11-10');
  });
});
