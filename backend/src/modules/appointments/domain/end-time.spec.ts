import { calcularHoraFin } from './end-time';

describe('calcularHoraFin', () => {
  it('suma la duración del servicio a la hora de inicio', () => {
    const inicio = new Date('2026-11-10T14:00:00.000Z');

    expect(calcularHoraFin(inicio, 30)).toEqual(new Date('2026-11-10T14:30:00.000Z'));
  });

  it('cruza de hora cuando la duración lo exige', () => {
    const inicio = new Date('2026-11-10T14:45:00.000Z');

    expect(calcularHoraFin(inicio, 90)).toEqual(new Date('2026-11-10T16:15:00.000Z'));
  });

  it('cruza de día cuando la cita termina después de medianoche', () => {
    const inicio = new Date('2026-11-10T23:45:00.000Z');

    expect(calcularHoraFin(inicio, 30)).toEqual(new Date('2026-11-11T00:15:00.000Z'));
  });

  it('no modifica la fecha de inicio que recibe', () => {
    const inicio = new Date('2026-11-10T14:00:00.000Z');

    calcularHoraFin(inicio, 30);

    expect(inicio).toEqual(new Date('2026-11-10T14:00:00.000Z'));
  });
});
