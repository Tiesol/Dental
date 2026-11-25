import { calculateEndTime } from './end-time';

describe('calculateEndTime', () => {
  it('suma la duración del servicio a la hora de inicio', () => {
    const start = new Date('2026-11-10T14:00:00.000Z');

    expect(calculateEndTime(start, 30)).toEqual(new Date('2026-11-10T14:30:00.000Z'));
  });

  it('cruza de hora cuando la duración lo exige', () => {
    const start = new Date('2026-11-10T14:45:00.000Z');

    expect(calculateEndTime(start, 90)).toEqual(new Date('2026-11-10T16:15:00.000Z'));
  });

  it('cruza de día cuando la cita termina después de medianoche', () => {
    const start = new Date('2026-11-10T23:45:00.000Z');

    expect(calculateEndTime(start, 30)).toEqual(new Date('2026-11-11T00:15:00.000Z'));
  });

  it('no modifica la fecha de inicio que recibe', () => {
    const start = new Date('2026-11-10T14:00:00.000Z');

    calculateEndTime(start, 30);

    expect(start).toEqual(new Date('2026-11-10T14:00:00.000Z'));
  });
});
