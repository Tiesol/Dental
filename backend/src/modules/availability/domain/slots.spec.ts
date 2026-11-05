import { Intervalo } from '../../appointments/domain/overlap';
import { calcularSlots } from './slots';

const instante = (hora: string) => new Date(`2026-11-10T${hora}:00.000Z`);
const intervalo = (inicio: string, fin: string): Intervalo => ({
  inicio: instante(inicio),
  fin: instante(fin),
});
const inicios = (slots: Intervalo[]) => slots.map((s) => s.inicio.toISOString().slice(11, 16));

describe('calcularSlots', () => {
  const base = {
    tramos: [intervalo('09:00', '10:00')],
    bloques: [],
    citas: [],
    duracionMin: 30,
    ahora: instante('00:00'),
    pasoMin: 15,
  };

  it('genera los horarios desde el inicio del tramo, cada pasoMin minutos', () => {
    const slots = calcularSlots(base);

    expect(inicios(slots)).toEqual(['09:00', '09:15', '09:30']);
  });

  it('devuelve cada horario con su fin según la duración del servicio', () => {
    const [primero] = calcularSlots(base);

    expect(primero).toEqual(intervalo('09:00', '09:30'));
  });

  it('no ofrece un horario cuya duración no cabe al final del tramo', () => {
    const slots = calcularSlots({ ...base, duracionMin: 45 });

    expect(inicios(slots)).toEqual(['09:00', '09:15']);
  });

  it('ofrece el horario que termina exactamente al final del tramo', () => {
    const slots = calcularSlots({ ...base, duracionMin: 60 });

    expect(inicios(slots)).toEqual(['09:00']);
  });

  it('no devuelve nada si la duración es mayor que el tramo', () => {
    expect(calcularSlots({ ...base, duracionMin: 90 })).toEqual([]);
  });

  it('no devuelve nada si no hay tramos', () => {
    expect(calcularSlots({ ...base, tramos: [] })).toEqual([]);
  });

  it('no devuelve un horario que toca un bloque no disponible', () => {
    const slots = calcularSlots({ ...base, bloques: [intervalo('09:20', '09:25')] });

    expect(inicios(slots)).toEqual(['09:30']);
  });

  it('no devuelve un horario que se solapa con una cita', () => {
    const slots = calcularSlots({ ...base, citas: [intervalo('09:15', '09:45')] });

    expect(inicios(slots)).toEqual([]);
  });

  it('permite un horario consecutivo a una cita, antes y después', () => {
    const tramos = [intervalo('09:00', '11:00')];

    const slots = calcularSlots({ ...base, tramos, citas: [intervalo('09:30', '10:00')] });

    expect(inicios(slots)).toEqual(['09:00', '10:00', '10:15', '10:30']);
  });

  it('con "ahora" a mitad del día solo ofrece horarios desde ese momento', () => {
    const slots = calcularSlots({ ...base, ahora: instante('09:20') });

    expect(inicios(slots)).toEqual(['09:30']);
  });

  it('ofrece el horario que empieza exactamente ahora', () => {
    const slots = calcularSlots({ ...base, ahora: instante('09:15') });

    expect(inicios(slots)).toEqual(['09:15', '09:30']);
  });

  it('no devuelve nada si todo el día ya pasó', () => {
    expect(calcularSlots({ ...base, ahora: instante('23:00') })).toEqual([]);
  });

  it('devuelve los horarios de un horario partido, ordenados aunque los tramos lleguen al revés', () => {
    const tramos = [intervalo('14:00', '14:30'), intervalo('09:00', '09:30')];

    const slots = calcularSlots({ ...base, tramos });

    expect(inicios(slots)).toEqual(['09:00', '14:00']);
  });

  it('respeta el paso indicado', () => {
    const tramos = [intervalo('09:00', '10:00')];

    const slots = calcularSlots({ ...base, tramos, pasoMin: 20, duracionMin: 20 });

    expect(inicios(slots)).toEqual(['09:00', '09:20', '09:40']);
  });
});
