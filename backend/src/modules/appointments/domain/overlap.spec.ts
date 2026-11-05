import { Intervalo, seSolapan } from './overlap';

const intervalo = (inicio: string, fin: string): Intervalo => ({
  inicio: new Date(`2026-11-10T${inicio}:00.000Z`),
  fin: new Date(`2026-11-10T${fin}:00.000Z`),
});

describe('seSolapan', () => {
  const cita = intervalo('10:00', '10:30');

  describe('detecta solapamiento', () => {
    it('cuando los dos intervalos son idénticos', () => {
      expect(seSolapan(cita, intervalo('10:00', '10:30'))).toBe(true);
    });

    it('cuando el segundo empieza antes de que termine el primero', () => {
      expect(seSolapan(cita, intervalo('10:15', '10:45'))).toBe(true);
    });

    it('cuando el segundo termina después de que empiece el primero', () => {
      expect(seSolapan(cita, intervalo('09:45', '10:15'))).toBe(true);
    });

    it('sin importar el orden de los argumentos', () => {
      const otra = intervalo('10:15', '10:45');

      expect(seSolapan(otra, cita)).toBe(true);
      expect(seSolapan(cita, otra)).toBe(true);
    });

    it('cuando el segundo está contenido en el primero', () => {
      expect(seSolapan(cita, intervalo('10:10', '10:20'))).toBe(true);
    });

    it('cuando el segundo contiene al primero', () => {
      expect(seSolapan(cita, intervalo('09:00', '11:00'))).toBe(true);
    });
  });

  describe('citas consecutivas', () => {
    it('permite una cita que empieza justo cuando termina la otra', () => {
      expect(seSolapan(cita, intervalo('10:30', '11:00'))).toBe(false);
    });

    it('permite una cita que termina justo cuando empieza la otra', () => {
      expect(seSolapan(cita, intervalo('09:30', '10:00'))).toBe(false);
    });
  });

  describe('no detecta solapamiento', () => {
    it('cuando los intervalos están separados', () => {
      expect(seSolapan(cita, intervalo('14:00', '14:30'))).toBe(false);
    });
  });
});
