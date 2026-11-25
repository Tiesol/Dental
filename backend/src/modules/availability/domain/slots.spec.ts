import { Interval } from '../../appointments/domain/overlap';
import { calculateSlots } from './slots';

const instant = (time: string) => new Date(`2026-11-10T${time}:00.000Z`);
const interval = (start: string, end: string): Interval => ({
  inicio: instant(start),
  fin: instant(end),
});
const starts = (slots: Interval[]) => slots.map((s) => s.inicio.toISOString().slice(11, 16));

describe('calculateSlots', () => {
  const base = {
    timeRanges: [interval('09:00', '10:00')],
    blocks: [],
    appointments: [],
    duracionMin: 30,
    now: instant('00:00'),
    stepMin: 15,
  };

  it('genera los horarios desde el inicio del tramo, cada stepMin minutos', () => {
    const slots = calculateSlots(base);

    expect(starts(slots)).toEqual(['09:00', '09:15', '09:30']);
  });

  it('devuelve cada horario con su fin según la duración del servicio', () => {
    const [first] = calculateSlots(base);

    expect(first).toEqual(interval('09:00', '09:30'));
  });

  it('no ofrece un horario cuya duración no cabe al final del tramo', () => {
    const slots = calculateSlots({ ...base, duracionMin: 45 });

    expect(starts(slots)).toEqual(['09:00', '09:15']);
  });

  it('ofrece el horario que termina exactamente al final del tramo', () => {
    const slots = calculateSlots({ ...base, duracionMin: 60 });

    expect(starts(slots)).toEqual(['09:00']);
  });

  it('no devuelve nada si la duración es mayor que el tramo', () => {
    expect(calculateSlots({ ...base, duracionMin: 90 })).toEqual([]);
  });

  it('no devuelve nada si no hay tramos', () => {
    expect(calculateSlots({ ...base, timeRanges: [] })).toEqual([]);
  });

  it('no devuelve un horario que toca un bloque no disponible', () => {
    const slots = calculateSlots({ ...base, blocks: [interval('09:20', '09:25')] });

    expect(starts(slots)).toEqual(['09:30']);
  });

  it('no devuelve un horario que se solapa con una cita', () => {
    const slots = calculateSlots({ ...base, appointments: [interval('09:15', '09:45')] });

    expect(starts(slots)).toEqual([]);
  });

  it('permite un horario consecutivo a una cita, antes y después', () => {
    const timeRanges = [interval('09:00', '11:00')];

    const slots = calculateSlots({
      ...base,
      timeRanges,
      appointments: [interval('09:30', '10:00')],
    });

    expect(starts(slots)).toEqual(['09:00', '10:00', '10:15', '10:30']);
  });

  it('con "ahora" a mitad del día solo ofrece horarios desde ese momento', () => {
    const slots = calculateSlots({ ...base, now: instant('09:20') });

    expect(starts(slots)).toEqual(['09:30']);
  });

  it('ofrece el horario que empieza exactamente ahora', () => {
    const slots = calculateSlots({ ...base, now: instant('09:15') });

    expect(starts(slots)).toEqual(['09:15', '09:30']);
  });

  it('no devuelve nada si todo el día ya pasó', () => {
    expect(calculateSlots({ ...base, now: instant('23:00') })).toEqual([]);
  });

  it('devuelve los horarios de un horario partido, ordenados aunque los tramos lleguen al revés', () => {
    const timeRanges = [interval('14:00', '14:30'), interval('09:00', '09:30')];

    const slots = calculateSlots({ ...base, timeRanges });

    expect(starts(slots)).toEqual(['09:00', '14:00']);
  });

  it('respeta el paso indicado', () => {
    const timeRanges = [interval('09:00', '10:00')];

    const slots = calculateSlots({ ...base, timeRanges, stepMin: 20, duracionMin: 20 });

    expect(starts(slots)).toEqual(['09:00', '09:20', '09:40']);
  });
});
