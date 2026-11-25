import {
  AppointmentNotInProgressError,
  ObservationAlreadyRegisteredError,
} from '../../../common/errors/domain-error';
import { assertCanRegisterObservation } from './observation-rules';

describe('assertCanRegisterObservation', () => {
  it('la permite en una cita EN_ATENCION sin observación', () => {
    const appointment = { estado: 'EN_ATENCION' as const, observacion: null };

    expect(() => assertCanRegisterObservation(appointment)).not.toThrow();
  });

  it.each(['PENDIENTE', 'CONFIRMADA', 'FINALIZADA', 'CANCELADA'] as const)(
    'la rechaza en una cita %s',
    (status) => {
      const appointment = { estado: status, observacion: null };

      expect(() => assertCanRegisterObservation(appointment)).toThrow(
        AppointmentNotInProgressError,
      );
    },
  );

  it('rechaza una segunda observación sobre la misma cita (D5)', () => {
    const appointment = {
      estado: 'EN_ATENCION' as const,
      observacion: { texto: 'Primera', createdAt: new Date('2026-11-09T14:00:00Z') },
    };

    expect(() => assertCanRegisterObservation(appointment)).toThrow(
      ObservationAlreadyRegisteredError,
    );
  });
});
