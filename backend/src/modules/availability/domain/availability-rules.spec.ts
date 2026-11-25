import { InvalidDateError, InvalidScheduleError } from '../../../common/errors/domain-error';
import { AvailabilityRuleInput } from './availability';
import { assertValidBlock, assertValidSchedule, toPublicAvailability } from './availability-rules';

const MONDAY = 1;
const TUESDAY = 2;

const timeRange = (
  startMinute: number,
  endMinute: number,
  weekday = MONDAY,
): AvailabilityRuleInput => ({
  diaSemana: weekday,
  minutoInicio: startMinute,
  minutoFin: endMinute,
});

describe('assertValidSchedule', () => {
  describe('horarios aceptados', () => {
    it('acepta una lista vacía, que deja al odontólogo sin horarios', () => {
      expect(() => assertValidSchedule([])).not.toThrow();
    });

    it('acepta un horario partido en dos tramos separados del mismo día', () => {
      expect(() => assertValidSchedule([timeRange(480, 720), timeRange(840, 1080)])).not.toThrow();
    });

    it('acepta tramos consecutivos, donde uno termina cuando empieza el otro', () => {
      expect(() => assertValidSchedule([timeRange(540, 720), timeRange(720, 900)])).not.toThrow();
    });

    it('acepta tramos válidos aunque lleguen desordenados', () => {
      expect(() => assertValidSchedule([timeRange(840, 1080), timeRange(480, 720)])).not.toThrow();
    });

    it('acepta el mismo tramo en días distintos', () => {
      const schedule = [timeRange(540, 720, MONDAY), timeRange(540, 720, TUESDAY)];

      expect(() => assertValidSchedule(schedule)).not.toThrow();
    });

    it.each([
      ['domingo', 0],
      ['sábado', 6],
    ])('acepta el %s como día válido', (_name, day) => {
      expect(() => assertValidSchedule([timeRange(540, 720, day)])).not.toThrow();
    });

    it('acepta un tramo que ocupa el día completo, de 0 a 1440', () => {
      expect(() => assertValidSchedule([timeRange(0, 1440)])).not.toThrow();
    });
  });

  describe('horarios rechazados', () => {
    it.each([
      ['menor que 0', -1],
      ['mayor que 6', 7],
      ['con decimales', 1.5],
    ])('rechaza un día de la semana %s', (_testCase, day) => {
      expect(() => assertValidSchedule([timeRange(540, 720, day)])).toThrow(InvalidScheduleError);
    });

    it.each([
      ['inicio negativo', -1, 720],
      ['fin mayor que 1440', 540, 1441],
      ['inicio con decimales', 540.5, 720],
      ['fin con decimales', 540, 720.5],
    ])('rechaza minutos fuera de rango: %s', (_testCase, start, end) => {
      expect(() => assertValidSchedule([timeRange(start, end)])).toThrow(InvalidScheduleError);
    });

    it('rechaza un tramo cuyo inicio es igual a su fin', () => {
      expect(() => assertValidSchedule([timeRange(540, 540)])).toThrow(InvalidScheduleError);
    });

    it('rechaza un tramo cuyo inicio es posterior a su fin', () => {
      expect(() => assertValidSchedule([timeRange(720, 540)])).toThrow(InvalidScheduleError);
    });

    it('rechaza dos tramos del mismo día que se solapan parcialmente', () => {
      const schedule = [timeRange(540, 720), timeRange(700, 900)];

      expect(() => assertValidSchedule(schedule)).toThrow(InvalidScheduleError);
    });

    it('rechaza un tramo contenido dentro de otro del mismo día', () => {
      const schedule = [timeRange(540, 900), timeRange(600, 660)];

      expect(() => assertValidSchedule(schedule)).toThrow(InvalidScheduleError);
    });

    it('rechaza dos tramos idénticos en el mismo día', () => {
      const schedule = [timeRange(540, 720), timeRange(540, 720)];

      expect(() => assertValidSchedule(schedule)).toThrow(InvalidScheduleError);
    });

    it('detecta el solapamiento aunque los tramos lleguen desordenados', () => {
      const schedule = [timeRange(700, 900), timeRange(100, 200), timeRange(540, 720)];

      expect(() => assertValidSchedule(schedule)).toThrow(InvalidScheduleError);
    });

    it('detecta el solapamiento aunque otro día tenga un tramo a una hora intermedia', () => {
      const schedule = [
        timeRange(540, 720, MONDAY),
        timeRange(600, 660, TUESDAY),
        timeRange(700, 900, MONDAY),
      ];

      expect(() => assertValidSchedule(schedule)).toThrow(InvalidScheduleError);
    });
  });
});

describe('toPublicAvailability', () => {
  it('quita el motivo de los bloques y conserva horarios y fechas', () => {
    const schedule = [{ id: 'h1', ...timeRange(540, 720) }];
    const start = new Date('2026-11-10T14:00:00Z');
    const end = new Date('2026-11-10T15:00:00Z');

    const result = toPublicAvailability({
      horarios: schedule,
      bloques: [{ id: 'b1', inicio: start, fin: end, motivo: 'Cirugía personal' }],
    });

    expect(result).toEqual({
      horarios: schedule,
      bloques: [{ id: 'b1', inicio: start, fin: end }],
    });
  });
});

describe('assertValidBlock', () => {
  const now = new Date('2026-11-09T14:00:00Z');

  it('acepta un bloque futuro', () => {
    const block = {
      inicio: new Date('2026-11-10T14:00:00Z'),
      fin: new Date('2026-11-10T15:00:00Z'),
    };

    expect(() => assertValidBlock(block, now)).not.toThrow();
  });

  it('acepta un bloque que ya empezó pero todavía no termina', () => {
    const block = {
      inicio: new Date('2026-11-09T13:00:00Z'),
      fin: new Date('2026-11-09T15:00:00Z'),
    };

    expect(() => assertValidBlock(block, now)).not.toThrow();
  });

  it('rechaza un bloque cuyo fin es igual a su inicio', () => {
    const block = {
      inicio: new Date('2026-11-10T14:00:00Z'),
      fin: new Date('2026-11-10T14:00:00Z'),
    };

    expect(() => assertValidBlock(block, now)).toThrow(InvalidDateError);
  });

  it('rechaza un bloque cuyo fin es anterior a su inicio', () => {
    const block = {
      inicio: new Date('2026-11-10T15:00:00Z'),
      fin: new Date('2026-11-10T14:00:00Z'),
    };

    expect(() => assertValidBlock(block, now)).toThrow(InvalidDateError);
  });

  it('rechaza un bloque que ya terminó', () => {
    const block = {
      inicio: new Date('2026-11-08T14:00:00Z'),
      fin: new Date('2026-11-08T15:00:00Z'),
    };

    expect(() => assertValidBlock(block, now)).toThrow(InvalidDateError);
  });

  it('rechaza un bloque que termina exactamente ahora, porque el intervalo es semiabierto', () => {
    const block = { inicio: new Date('2026-11-09T13:00:00Z'), fin: now };

    expect(() => assertValidBlock(block, now)).toThrow(InvalidDateError);
  });
});
