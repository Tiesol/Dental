import {
  CitaNoEnAtencionError,
  ObservacionYaRegistradaError,
} from '../../../common/errors/domain-error';
import { assertPuedeRegistrarObservacion } from './observation-rules';

describe('assertPuedeRegistrarObservacion', () => {
  it('la permite en una cita EN_ATENCION sin observación', () => {
    const cita = { estado: 'EN_ATENCION' as const, observacion: null };

    expect(() => assertPuedeRegistrarObservacion(cita)).not.toThrow();
  });

  it.each(['PENDIENTE', 'CONFIRMADA', 'FINALIZADA', 'CANCELADA'] as const)(
    'la rechaza en una cita %s',
    (estado) => {
      const cita = { estado, observacion: null };

      expect(() => assertPuedeRegistrarObservacion(cita)).toThrow(CitaNoEnAtencionError);
    },
  );

  it('rechaza una segunda observación sobre la misma cita (D5)', () => {
    const cita = {
      estado: 'EN_ATENCION' as const,
      observacion: { texto: 'Primera', createdAt: new Date('2026-11-09T14:00:00Z') },
    };

    expect(() => assertPuedeRegistrarObservacion(cita)).toThrow(ObservacionYaRegistradaError);
  });
});
