import { FechaInvalidaError, HorarioInvalidoError } from '../../../common/errors/domain-error';
import { AvailabilityRuleInput } from './availability';
import {
  assertBloqueValido,
  assertHorariosValidos,
  toPublicAvailability,
} from './availability-rules';

const LUNES = 1;
const MARTES = 2;

const tramo = (
  minutoInicio: number,
  minutoFin: number,
  diaSemana = LUNES,
): AvailabilityRuleInput => ({ diaSemana, minutoInicio, minutoFin });

describe('assertHorariosValidos', () => {
  describe('horarios aceptados', () => {
    it('acepta una lista vacía, que deja al odontólogo sin horarios', () => {
      expect(() => assertHorariosValidos([])).not.toThrow();
    });

    it('acepta un horario partido en dos tramos separados del mismo día', () => {
      expect(() => assertHorariosValidos([tramo(480, 720), tramo(840, 1080)])).not.toThrow();
    });

    it('acepta tramos consecutivos, donde uno termina cuando empieza el otro', () => {
      expect(() => assertHorariosValidos([tramo(540, 720), tramo(720, 900)])).not.toThrow();
    });

    it('acepta el mismo tramo en días distintos', () => {
      const horarios = [tramo(540, 720, LUNES), tramo(540, 720, MARTES)];

      expect(() => assertHorariosValidos(horarios)).not.toThrow();
    });

    it.each([
      ['domingo', 0],
      ['sábado', 6],
    ])('acepta el %s como día válido', (_nombre, dia) => {
      expect(() => assertHorariosValidos([tramo(540, 720, dia)])).not.toThrow();
    });

    it('acepta un tramo que ocupa el día completo, de 0 a 1440', () => {
      expect(() => assertHorariosValidos([tramo(0, 1440)])).not.toThrow();
    });
  });

  describe('horarios rechazados', () => {
    it.each([
      ['menor que 0', -1],
      ['mayor que 6', 7],
      ['con decimales', 1.5],
    ])('rechaza un día de la semana %s', (_caso, dia) => {
      expect(() => assertHorariosValidos([tramo(540, 720, dia)])).toThrow(HorarioInvalidoError);
    });

    it.each([
      ['inicio negativo', -1, 720],
      ['fin mayor que 1440', 540, 1441],
      ['inicio con decimales', 540.5, 720],
      ['fin con decimales', 540, 720.5],
    ])('rechaza minutos fuera de rango: %s', (_caso, inicio, fin) => {
      expect(() => assertHorariosValidos([tramo(inicio, fin)])).toThrow(HorarioInvalidoError);
    });

    it('rechaza un tramo cuyo inicio es igual a su fin', () => {
      expect(() => assertHorariosValidos([tramo(540, 540)])).toThrow(HorarioInvalidoError);
    });

    it('rechaza un tramo cuyo inicio es posterior a su fin', () => {
      expect(() => assertHorariosValidos([tramo(720, 540)])).toThrow(HorarioInvalidoError);
    });

    it('rechaza dos tramos del mismo día que se solapan parcialmente', () => {
      const horarios = [tramo(540, 720), tramo(700, 900)];

      expect(() => assertHorariosValidos(horarios)).toThrow(HorarioInvalidoError);
    });

    it('rechaza un tramo contenido dentro de otro del mismo día', () => {
      const horarios = [tramo(540, 900), tramo(600, 660)];

      expect(() => assertHorariosValidos(horarios)).toThrow(HorarioInvalidoError);
    });

    it('rechaza dos tramos idénticos en el mismo día', () => {
      const horarios = [tramo(540, 720), tramo(540, 720)];

      expect(() => assertHorariosValidos(horarios)).toThrow(HorarioInvalidoError);
    });

    it('detecta el solapamiento aunque los tramos lleguen desordenados', () => {
      const horarios = [tramo(700, 900), tramo(100, 200), tramo(540, 720)];

      expect(() => assertHorariosValidos(horarios)).toThrow(HorarioInvalidoError);
    });

    it('detecta el solapamiento aunque otro día tenga un tramo a una hora intermedia', () => {
      const horarios = [tramo(540, 720, LUNES), tramo(600, 660, MARTES), tramo(700, 900, LUNES)];

      expect(() => assertHorariosValidos(horarios)).toThrow(HorarioInvalidoError);
    });
  });
});

describe('toPublicAvailability', () => {
  it('quita el motivo de los bloques y conserva horarios y fechas', () => {
    const horarios = [{ id: 'h1', ...tramo(540, 720) }];
    const inicio = new Date('2026-11-10T14:00:00Z');
    const fin = new Date('2026-11-10T15:00:00Z');

    const resultado = toPublicAvailability({
      horarios,
      bloques: [{ id: 'b1', inicio, fin, motivo: 'Cirugía personal' }],
    });

    expect(resultado).toEqual({ horarios, bloques: [{ id: 'b1', inicio, fin }] });
  });
});

describe('assertBloqueValido', () => {
  const ahora = new Date('2026-11-09T14:00:00Z');

  it('acepta un bloque futuro', () => {
    const bloque = {
      inicio: new Date('2026-11-10T14:00:00Z'),
      fin: new Date('2026-11-10T15:00:00Z'),
    };

    expect(() => assertBloqueValido(bloque, ahora)).not.toThrow();
  });

  it('acepta un bloque que ya empezó pero todavía no termina', () => {
    const bloque = {
      inicio: new Date('2026-11-09T13:00:00Z'),
      fin: new Date('2026-11-09T15:00:00Z'),
    };

    expect(() => assertBloqueValido(bloque, ahora)).not.toThrow();
  });

  it('rechaza un bloque cuyo fin es igual a su inicio', () => {
    const bloque = {
      inicio: new Date('2026-11-10T14:00:00Z'),
      fin: new Date('2026-11-10T14:00:00Z'),
    };

    expect(() => assertBloqueValido(bloque, ahora)).toThrow(FechaInvalidaError);
  });

  it('rechaza un bloque cuyo fin es anterior a su inicio', () => {
    const bloque = {
      inicio: new Date('2026-11-10T15:00:00Z'),
      fin: new Date('2026-11-10T14:00:00Z'),
    };

    expect(() => assertBloqueValido(bloque, ahora)).toThrow(FechaInvalidaError);
  });

  it('rechaza un bloque que ya terminó', () => {
    const bloque = {
      inicio: new Date('2026-11-08T14:00:00Z'),
      fin: new Date('2026-11-08T15:00:00Z'),
    };

    expect(() => assertBloqueValido(bloque, ahora)).toThrow(FechaInvalidaError);
  });

  it('rechaza un bloque que termina exactamente ahora, porque el intervalo es semiabierto', () => {
    const bloque = { inicio: new Date('2026-11-09T13:00:00Z'), fin: ahora };

    expect(() => assertBloqueValido(bloque, ahora)).toThrow(FechaInvalidaError);
  });
});
