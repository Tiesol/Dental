import { Interval, overlaps } from './overlap';

const interval = (start: string, end: string): Interval => ({
  inicio: new Date(`2026-11-10T${start}:00.000Z`),
  fin: new Date(`2026-11-10T${end}:00.000Z`),
});

describe('overlaps', () => {
  const appointment = interval('10:00', '10:30');

  describe('detecta solapamiento', () => {
    it('cuando los dos intervalos son idénticos', () => {
      expect(overlaps(appointment, interval('10:00', '10:30'))).toBe(true);
    });

    it('cuando el segundo empieza antes de que termine el primero', () => {
      expect(overlaps(appointment, interval('10:15', '10:45'))).toBe(true);
    });

    it('cuando el segundo termina después de que empiece el primero', () => {
      expect(overlaps(appointment, interval('09:45', '10:15'))).toBe(true);
    });

    it('sin importar el orden de los argumentos', () => {
      const other = interval('10:15', '10:45');

      expect(overlaps(other, appointment)).toBe(true);
      expect(overlaps(appointment, other)).toBe(true);
    });

    it('cuando el segundo está contenido en el primero', () => {
      expect(overlaps(appointment, interval('10:10', '10:20'))).toBe(true);
    });

    it('cuando el segundo contiene al primero', () => {
      expect(overlaps(appointment, interval('09:00', '11:00'))).toBe(true);
    });
  });

  describe('citas consecutivas', () => {
    it('permite una cita que empieza justo cuando termina la otra', () => {
      expect(overlaps(appointment, interval('10:30', '11:00'))).toBe(false);
    });

    it('permite una cita que termina justo cuando empieza la otra', () => {
      expect(overlaps(appointment, interval('09:30', '10:00'))).toBe(false);
    });
  });

  describe('no detecta solapamiento', () => {
    it('cuando los intervalos están separados', () => {
      expect(overlaps(appointment, interval('14:00', '14:30'))).toBe(false);
    });
  });
});
