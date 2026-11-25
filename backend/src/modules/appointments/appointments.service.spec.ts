import {
  AppointmentAccessDeniedError,
  AccessDeniedError,
  AppointmentNotModifiableError,
  SlotInThePastError,
  SlotUnavailableError,
  ObservationRequiredError,
  DentistDoesNotOfferServiceError,
  ResourceNotFoundError,
  ServiceDisabledError,
  InvalidStatusTransitionError,
} from '../../common/errors/domain-error';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  const now = new Date('2026-11-09T14:00:00.000Z');
  const startsAt = '2026-11-10T13:00:00.000Z';
  const dto = { dentistId: 'd1', serviceId: 's1', horaInicio: startsAt };
  const tx = { soy: 'la transacción' };

  const repository = {
    withDentistLock: jest.fn(),
    create: jest.fn(),
    updateTimes: jest.fn(),
    updateStatus: jest.fn(),
    findById: jest.fn(),
    findByPatient: jest.fn(),
    findAll: jest.fn(),
    findAgenda: jest.fn(),
    findUpcoming: jest.fn(),
  };
  const availability = {
    assertBookable: jest.fn(),
    daySlots: jest.fn(),
    clinicDate: jest.fn(),
    dateRange: jest.fn(),
  };
  const service = new AppointmentsService(
    repository as unknown as AppointmentsRepository,
    availability as unknown as AvailabilityService,
    { now: () => now },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.withDentistLock.mockImplementation((_id: string, fn: (t: unknown) => unknown) =>
      fn(tx),
    );
    availability.assertBookable.mockResolvedValue({ id: 's1', duracionMin: 45 });
    availability.clinicDate.mockReturnValue('2026-11-10');
    availability.daySlots.mockResolvedValue([
      { inicio: new Date(startsAt), fin: new Date('2026-11-10T13:45:00.000Z') },
    ]);
    repository.create.mockResolvedValue({ id: 'c1' });
  });

  describe('reservar', () => {
    it('crea la cita con la hora de fin según la duración del servicio', async () => {
      const appointment = await service.book(dto, 'p1');

      expect(appointment).toEqual({ id: 'c1' });
      expect(repository.create).toHaveBeenCalledWith(tx, {
        patientId: 'p1',
        dentistId: 'd1',
        serviceId: 's1',
        horaInicio: new Date(startsAt),
        horaFin: new Date('2026-11-10T13:45:00.000Z'),
      });
    });

    it('valida dentro de la transacción con el odontólogo bloqueado', async () => {
      await service.book(dto, 'p1');

      expect(repository.withDentistLock).toHaveBeenCalledWith('d1', expect.any(Function));
      expect(availability.assertBookable).toHaveBeenCalledWith('d1', 's1', tx);
      expect(availability.daySlots).toHaveBeenCalledWith({
        dentistId: 'd1',
        fecha: '2026-11-10',
        duracionMin: 45,
        tx,
      });
    });

    it.each([
      ['el servicio está deshabilitado', new ServiceDisabledError()],
      ['el odontólogo no realiza el servicio', new DentistDoesNotOfferServiceError()],
    ])('no crea la cita si %s', async (_testCase, error) => {
      availability.assertBookable.mockRejectedValue(error);

      await expect(service.book(dto, 'p1')).rejects.toThrow(error);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('no crea la cita si el horario no está entre los disponibles', async () => {
      availability.daySlots.mockResolvedValue([]);

      await expect(service.book(dto, 'p1')).rejects.toThrow(SlotUnavailableError);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('no crea la cita si el horario ya pasó', async () => {
      const past = { ...dto, horaInicio: '2026-11-03T13:00:00.000Z' };

      await expect(service.book(past, 'p1')).rejects.toThrow(SlotInThePastError);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('reprogramar y cancelar', () => {
    const owner = {
      userId: 'u1',
      email: 'a@mail.com',
      role: 'PACIENTE' as const,
      patientId: 'p1',
    };
    const appointment = (status: string) => ({
      id: 'c1',
      estado: status,
      paciente: { id: 'p1' },
      odontologo: { id: 'd1' },
      servicio: { id: 's1' },
    });

    it('reprograma excluyendo la propia cita y recalcula la hora de fin', async () => {
      repository.findById.mockResolvedValue(appointment('CONFIRMADA'));

      await service.reschedule('c1', startsAt, owner);

      expect(availability.daySlots).toHaveBeenCalledWith(
        expect.objectContaining({ dentistId: 'd1', excludeAppointmentId: 'c1', tx }),
      );
      expect(repository.updateTimes).toHaveBeenCalledWith(tx, 'c1', {
        horaInicio: new Date(startsAt),
        horaFin: new Date('2026-11-10T13:45:00.000Z'),
      });
    });

    it('no toca la cita si el horario nuevo no está disponible', async () => {
      repository.findById.mockResolvedValue(appointment('PENDIENTE'));
      availability.daySlots.mockResolvedValue([]);

      await expect(service.reschedule('c1', startsAt, owner)).rejects.toThrow(SlotUnavailableError);

      expect(repository.updateTimes).not.toHaveBeenCalled();
    });

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'])(
      'no reprograma una cita %s',
      async (status) => {
        repository.findById.mockResolvedValue(appointment(status));

        await expect(service.reschedule('c1', startsAt, owner)).rejects.toThrow(
          AppointmentNotModifiableError,
        );

        expect(repository.updateTimes).not.toHaveBeenCalled();
      },
    );

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'])(
      'no cancela una cita %s',
      async (status) => {
        repository.findById.mockResolvedValue(appointment(status));

        await expect(service.cancel('c1', owner)).rejects.toThrow(AppointmentNotModifiableError);

        expect(repository.updateStatus).not.toHaveBeenCalled();
      },
    );

    it('relee el estado dentro de la transacción: si cambió mientras esperaba, no modifica', async () => {
      repository.findById
        .mockResolvedValueOnce(appointment('PENDIENTE'))
        .mockResolvedValueOnce(appointment('CANCELADA'));

      await expect(service.cancel('c1', owner)).rejects.toThrow(AppointmentNotModifiableError);

      expect(repository.findById).toHaveBeenLastCalledWith('c1', tx);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('cancela dejando la cita en CANCELADA', async () => {
      repository.findById.mockResolvedValue(appointment('PENDIENTE'));

      await service.cancel('c1', owner);

      expect(repository.updateStatus).toHaveBeenCalledWith(tx, 'c1', 'CANCELADA');
    });

    it('rechaza a otro paciente antes de abrir la transacción', async () => {
      repository.findById.mockResolvedValue(appointment('PENDIENTE'));
      const other = { ...owner, patientId: 'p2' };

      await expect(service.cancel('c1', other)).rejects.toThrow(AppointmentAccessDeniedError);

      expect(repository.withDentistLock).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    const admin = { userId: 'u-admin', email: 'admin@clinica.com', role: 'ADMIN' as const };
    const dentist = {
      userId: 'u-doc',
      email: 'doc@clinica.com',
      role: 'ODONTOLOGO' as const,
      dentistId: 'd1',
    };
    const appointmentWith = (status: string, observation: { texto: string } | null = null) => ({
      id: 'c1',
      estado: status,
      paciente: { id: 'p1' },
      odontologo: { id: 'd1' },
      servicio: { id: 's1' },
      observacion: observation,
    });

    it('permite al ADMIN confirmar una cita pendiente dentro de la transacción', async () => {
      repository.findById.mockResolvedValue(appointmentWith('PENDIENTE'));
      repository.updateStatus.mockResolvedValue(appointmentWith('CONFIRMADA'));

      const result = await service.changeStatus('c1', 'CONFIRMADA', admin);

      expect(result).toEqual(appointmentWith('CONFIRMADA'));
      expect(repository.withDentistLock).toHaveBeenCalledWith('d1', expect.any(Function));
      expect(repository.findById).toHaveBeenLastCalledWith('c1', tx);
      expect(repository.updateStatus).toHaveBeenCalledWith(tx, 'c1', 'CONFIRMADA');
    });

    it('permite al odontólogo asignado confirmar su cita pendiente (D2)', async () => {
      repository.findById.mockResolvedValue(appointmentWith('PENDIENTE'));
      repository.updateStatus.mockResolvedValue(appointmentWith('CONFIRMADA'));

      const result = await service.changeStatus('c1', 'CONFIRMADA', dentist);

      expect(result).toEqual(appointmentWith('CONFIRMADA'));
      expect(repository.updateStatus).toHaveBeenCalledWith(tx, 'c1', 'CONFIRMADA');
    });

    it('permite al odontólogo asignado pasar a EN_ATENCION y finalizar con observación', async () => {
      repository.findById.mockResolvedValue(appointmentWith('CONFIRMADA'));
      await service.changeStatus('c1', 'EN_ATENCION', dentist);
      expect(repository.updateStatus).toHaveBeenCalledWith(tx, 'c1', 'EN_ATENCION');

      repository.findById.mockResolvedValue(
        appointmentWith('EN_ATENCION', { texto: 'Limpieza sin novedades' }),
      );
      await service.changeStatus('c1', 'FINALIZADA', dentist);
      expect(repository.updateStatus).toHaveBeenLastCalledWith(tx, 'c1', 'FINALIZADA');
    });

    it('impide finalizar una cita si no tiene observación registrada', async () => {
      repository.findById.mockResolvedValue(appointmentWith('EN_ATENCION', null));

      await expect(service.changeStatus('c1', 'FINALIZADA', dentist)).rejects.toThrow(
        ObservationRequiredError,
      );

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('rechaza transiciones inválidas sin actualizar el estado', async () => {
      repository.findById.mockResolvedValue(appointmentWith('FINALIZADA', { texto: 'Ok' }));

      await expect(service.changeStatus('c1', 'PENDIENTE', admin)).rejects.toThrow(
        InvalidStatusTransitionError,
      );

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('rechaza una transición válida cuando el rol no está autorizado', async () => {
      repository.findById.mockResolvedValue(appointmentWith('CONFIRMADA'));

      await expect(service.changeStatus('c1', 'EN_ATENCION', admin)).rejects.toThrow(
        AccessDeniedError,
      );

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it.each([
      ['PENDIENTE', 'CONFIRMADA'],
      ['CONFIRMADA', 'EN_ATENCION'],
    ] as const)(
      'rechaza a otro odontólogo en %s -> %s antes de bloquear al profesional',
      async (from, to) => {
        repository.findById.mockResolvedValue(appointmentWith(from));
        const other = { ...dentist, dentistId: 'd2' };

        await expect(service.changeStatus('c1', to, other)).rejects.toThrow(
          AppointmentAccessDeniedError,
        );

        expect(repository.withDentistLock).not.toHaveBeenCalled();
      },
    );

    it('relee el estado dentro de la transacción: si cambió mientras esperaba, no actualiza', async () => {
      repository.findById
        .mockResolvedValueOnce(appointmentWith('PENDIENTE'))
        .mockResolvedValueOnce(appointmentWith('CANCELADA'));

      await expect(service.changeStatus('c1', 'CONFIRMADA', admin)).rejects.toThrow(
        InvalidStatusTransitionError,
      );

      expect(repository.findById).toHaveBeenLastCalledWith('c1', tx);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('consulta solo las citas del paciente y las filtra según la hora del reloj', async () => {
      const upcoming = { id: 'c1', horaInicio: new Date(startsAt), estado: 'PENDIENTE' };
      const past = {
        id: 'c2',
        horaInicio: new Date('2026-11-03T13:00:00.000Z'),
        estado: 'FINALIZADA',
      };
      repository.findByPatient.mockResolvedValue([past, upcoming]);

      const appointments = await service.findMine('p1', 'proximas');

      expect(repository.findByPatient).toHaveBeenCalledWith('p1');
      expect(appointments).toEqual([upcoming]);
    });
  });

  describe('findOne', () => {
    const appointment = { id: 'c1', paciente: { id: 'p1' }, odontologo: { id: 'd1' } };

    it('entrega la cita a su dueño', async () => {
      repository.findById.mockResolvedValue(appointment);

      const result = await service.findOne('c1', {
        userId: 'u1',
        email: 'a@mail.com',
        role: 'PACIENTE',
        patientId: 'p1',
      });

      expect(result).toEqual(appointment);
    });

    it('rechaza a otro paciente con AppointmentAccessDeniedError', async () => {
      repository.findById.mockResolvedValue(appointment);

      await expect(
        service.findOne('c1', {
          userId: 'u2',
          email: 'b@mail.com',
          role: 'PACIENTE',
          patientId: 'p2',
        }),
      ).rejects.toThrow(AppointmentAccessDeniedError);
    });

    it('lanza ResourceNotFoundError si no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.findOne('c1', { userId: 'u1', email: 'a@mail.com', role: 'ADMIN' }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('agenda', () => {
    const range = { inicio: new Date(), fin: new Date() };

    beforeEach(() => availability.dateRange.mockReturnValue(range));

    it('sin fecha usa el día de la clínica según el reloj', async () => {
      availability.clinicDate.mockReturnValue('2026-11-09');

      await service.dayAgenda('d1');

      expect(availability.clinicDate).toHaveBeenCalledWith(now);
      expect(availability.dateRange).toHaveBeenCalledWith('2026-11-09');
      expect(repository.findAgenda).toHaveBeenCalledWith('d1', range);
    });

    it('con fecha usa esa fecha', async () => {
      await service.dayAgenda('d1', '2026-11-12');

      expect(availability.clinicDate).not.toHaveBeenCalled();
      expect(availability.dateRange).toHaveBeenCalledWith('2026-11-12');
    });

    it('las próximas se piden según la hora del reloj', async () => {
      await service.upcomingForDentist('d1', 10);

      expect(repository.findUpcoming).toHaveBeenCalledWith('d1', now, 10);
    });
  });

  describe('findAll', () => {
    const pagination = { limit: 50, offset: 0 };

    it('no filtra por rango si no se indica una fecha', async () => {
      await service.findAll(pagination);

      expect(availability.dateRange).not.toHaveBeenCalled();
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ range: undefined, ...pagination }),
      );
    });

    it('convierte la fecha al rango de ese día en la clínica', async () => {
      const range = { inicio: new Date(), fin: new Date() };
      availability.dateRange.mockReturnValue(range);

      await service.findAll({ ...pagination, fecha: '2026-11-10' });

      expect(availability.dateRange).toHaveBeenCalledWith('2026-11-10');
      expect(repository.findAll).toHaveBeenCalledWith(expect.objectContaining({ range }));
    });
  });
});
