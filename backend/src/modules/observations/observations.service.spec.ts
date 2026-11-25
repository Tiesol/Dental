import {
  AppointmentAccessDeniedError,
  AppointmentNotInProgressError,
  ObservationAlreadyRegisteredError,
} from '../../common/errors/domain-error';
import { AppointmentsService } from '../appointments/appointments.service';
import { ObservationsRepository } from './observations.repository';
import { ObservationsService } from './observations.service';

describe('ObservationsService.register', () => {
  const user = { userId: 'u1', email: 'a@mail.com', role: 'ODONTOLOGO' as const, dentistId: 'd1' };
  const repository = { create: jest.fn() };
  const appointments = { findOne: jest.fn() };
  const service = new ObservationsService(
    repository as unknown as ObservationsRepository,
    appointments as unknown as AppointmentsService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('guarda el texto sin espacios sobrantes en una cita EN_ATENCION', async () => {
    const created = { texto: 'Sin novedades', createdAt: new Date('2026-11-09T14:00:00Z') };
    appointments.findOne.mockResolvedValue({ estado: 'EN_ATENCION', observacion: null });
    repository.create.mockResolvedValue(created);

    const result = await service.register('c1', '  Sin novedades  ', user);

    expect(result).toEqual(created);
    expect(appointments.findOne).toHaveBeenCalledWith('c1', user);
    expect(repository.create).toHaveBeenCalledWith('c1', 'Sin novedades');
  });

  it('no guarda nada si la cita es de otro odontólogo', async () => {
    appointments.findOne.mockRejectedValue(new AppointmentAccessDeniedError());

    await expect(service.register('c1', 'Texto', user)).rejects.toThrow(
      AppointmentAccessDeniedError,
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('no guarda nada si la cita no está en atención', async () => {
    appointments.findOne.mockResolvedValue({ estado: 'CONFIRMADA', observacion: null });

    await expect(service.register('c1', 'Texto', user)).rejects.toThrow(
      AppointmentNotInProgressError,
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('no guarda una segunda observación', async () => {
    appointments.findOne.mockResolvedValue({
      estado: 'EN_ATENCION',
      observacion: { texto: 'Primera', createdAt: new Date('2026-11-09T14:00:00Z') },
    });

    await expect(service.register('c1', 'Otra', user)).rejects.toThrow(
      ObservationAlreadyRegisteredError,
    );

    expect(repository.create).not.toHaveBeenCalled();
  });
});
