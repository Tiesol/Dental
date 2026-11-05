import {
  AccesoDenegadoACitaError,
  CitaNoModificableError,
  HorarioEnElPasadoError,
  HorarioNoDisponibleError,
  OdontologoNoRealizaServicioError,
  RecursoNoEncontradoError,
  ServicioDeshabilitadoError,
} from '../../common/errors/domain-error';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  const ahora = new Date('2026-11-09T14:00:00.000Z');
  const horaInicio = '2026-11-10T13:00:00.000Z';
  const dto = { dentistId: 'd1', serviceId: 's1', horaInicio };
  const tx = { soy: 'la transacción' };

  const repository = {
    withDentistLock: jest.fn(),
    create: jest.fn(),
    updateHorario: jest.fn(),
    updateEstado: jest.fn(),
    findById: jest.fn(),
    findByPatient: jest.fn(),
    findAll: jest.fn(),
    findAgenda: jest.fn(),
    findUpcoming: jest.fn(),
  };
  const availability = {
    assertReservable: jest.fn(),
    slotsDelDia: jest.fn(),
    fechaClinica: jest.fn(),
    rangoDeFecha: jest.fn(),
  };
  const service = new AppointmentsService(
    repository as unknown as AppointmentsRepository,
    availability as unknown as AvailabilityService,
    { now: () => ahora },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.withDentistLock.mockImplementation((_id: string, fn: (t: unknown) => unknown) =>
      fn(tx),
    );
    availability.assertReservable.mockResolvedValue({ id: 's1', duracionMin: 45 });
    availability.fechaClinica.mockReturnValue('2026-11-10');
    availability.slotsDelDia.mockResolvedValue([
      { inicio: new Date(horaInicio), fin: new Date('2026-11-10T13:45:00.000Z') },
    ]);
    repository.create.mockResolvedValue({ id: 'c1' });
  });

  describe('reservar', () => {
    it('crea la cita con la hora de fin según la duración del servicio', async () => {
      const cita = await service.reservar(dto, 'p1');

      expect(cita).toEqual({ id: 'c1' });
      expect(repository.create).toHaveBeenCalledWith(tx, {
        patientId: 'p1',
        dentistId: 'd1',
        serviceId: 's1',
        horaInicio: new Date(horaInicio),
        horaFin: new Date('2026-11-10T13:45:00.000Z'),
      });
    });

    it('valida dentro de la transacción con el odontólogo bloqueado', async () => {
      await service.reservar(dto, 'p1');

      expect(repository.withDentistLock).toHaveBeenCalledWith('d1', expect.any(Function));
      expect(availability.assertReservable).toHaveBeenCalledWith('d1', 's1', tx);
      expect(availability.slotsDelDia).toHaveBeenCalledWith({
        dentistId: 'd1',
        fecha: '2026-11-10',
        duracionMin: 45,
        tx,
      });
    });

    it.each([
      ['el servicio está deshabilitado', new ServicioDeshabilitadoError()],
      ['el odontólogo no realiza el servicio', new OdontologoNoRealizaServicioError()],
    ])('no crea la cita si %s', async (_caso, error) => {
      availability.assertReservable.mockRejectedValue(error);

      await expect(service.reservar(dto, 'p1')).rejects.toThrow(error);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('no crea la cita si el horario no está entre los disponibles', async () => {
      availability.slotsDelDia.mockResolvedValue([]);

      await expect(service.reservar(dto, 'p1')).rejects.toThrow(HorarioNoDisponibleError);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('no crea la cita si el horario ya pasó', async () => {
      const pasado = { ...dto, horaInicio: '2026-11-03T13:00:00.000Z' };

      await expect(service.reservar(pasado, 'p1')).rejects.toThrow(HorarioEnElPasadoError);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('reprogramar y cancelar', () => {
    const dueno = {
      userId: 'u1',
      email: 'a@mail.com',
      role: 'PACIENTE' as const,
      patientId: 'p1',
    };
    const cita = (estado: string) => ({
      id: 'c1',
      estado,
      paciente: { id: 'p1' },
      odontologo: { id: 'd1' },
      servicio: { id: 's1' },
    });

    it('reprograma excluyendo la propia cita y recalcula la hora de fin', async () => {
      repository.findById.mockResolvedValue(cita('CONFIRMADA'));

      await service.reprogramar('c1', horaInicio, dueno);

      expect(availability.slotsDelDia).toHaveBeenCalledWith(
        expect.objectContaining({ dentistId: 'd1', excluirCitaId: 'c1', tx }),
      );
      expect(repository.updateHorario).toHaveBeenCalledWith(tx, 'c1', {
        horaInicio: new Date(horaInicio),
        horaFin: new Date('2026-11-10T13:45:00.000Z'),
      });
    });

    it('no toca la cita si el horario nuevo no está disponible', async () => {
      repository.findById.mockResolvedValue(cita('PENDIENTE'));
      availability.slotsDelDia.mockResolvedValue([]);

      await expect(service.reprogramar('c1', horaInicio, dueno)).rejects.toThrow(
        HorarioNoDisponibleError,
      );

      expect(repository.updateHorario).not.toHaveBeenCalled();
    });

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'])(
      'no reprograma ni cancela una cita %s',
      async (estado) => {
        repository.findById.mockResolvedValue(cita(estado));

        await expect(service.reprogramar('c1', horaInicio, dueno)).rejects.toThrow(
          CitaNoModificableError,
        );
        await expect(service.cancelar('c1', dueno)).rejects.toThrow(CitaNoModificableError);

        expect(repository.updateHorario).not.toHaveBeenCalled();
        expect(repository.updateEstado).not.toHaveBeenCalled();
      },
    );

    it('relee el estado dentro de la transacción: si cambió mientras esperaba, no modifica', async () => {
      repository.findById
        .mockResolvedValueOnce(cita('PENDIENTE'))
        .mockResolvedValueOnce(cita('CANCELADA'));

      await expect(service.cancelar('c1', dueno)).rejects.toThrow(CitaNoModificableError);

      expect(repository.findById).toHaveBeenLastCalledWith('c1', tx);
      expect(repository.updateEstado).not.toHaveBeenCalled();
    });

    it('cancela dejando la cita en CANCELADA', async () => {
      repository.findById.mockResolvedValue(cita('PENDIENTE'));

      await service.cancelar('c1', dueno);

      expect(repository.updateEstado).toHaveBeenCalledWith(tx, 'c1', 'CANCELADA');
    });

    it('rechaza a otro paciente antes de abrir la transacción', async () => {
      repository.findById.mockResolvedValue(cita('PENDIENTE'));
      const otro = { ...dueno, patientId: 'p2' };

      await expect(service.cancelar('c1', otro)).rejects.toThrow(AccesoDenegadoACitaError);

      expect(repository.withDentistLock).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('consulta solo las citas del paciente y las filtra según la hora del reloj', async () => {
      const proxima = { id: 'c1', horaInicio: new Date(horaInicio), estado: 'PENDIENTE' };
      const pasada = {
        id: 'c2',
        horaInicio: new Date('2026-11-03T13:00:00.000Z'),
        estado: 'FINALIZADA',
      };
      repository.findByPatient.mockResolvedValue([pasada, proxima]);

      const citas = await service.findMine('p1', 'proximas');

      expect(repository.findByPatient).toHaveBeenCalledWith('p1');
      expect(citas).toEqual([proxima]);
    });
  });

  describe('findOne', () => {
    const cita = { id: 'c1', paciente: { id: 'p1' }, odontologo: { id: 'd1' } };

    it('entrega la cita a su dueño', async () => {
      repository.findById.mockResolvedValue(cita);

      const resultado = await service.findOne('c1', {
        userId: 'u1',
        email: 'a@mail.com',
        role: 'PACIENTE',
        patientId: 'p1',
      });

      expect(resultado).toEqual(cita);
    });

    it('rechaza a otro paciente con AccesoDenegadoACitaError', async () => {
      repository.findById.mockResolvedValue(cita);

      await expect(
        service.findOne('c1', {
          userId: 'u2',
          email: 'b@mail.com',
          role: 'PACIENTE',
          patientId: 'p2',
        }),
      ).rejects.toThrow(AccesoDenegadoACitaError);
    });

    it('lanza RecursoNoEncontradoError si no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.findOne('c1', { userId: 'u1', email: 'a@mail.com', role: 'ADMIN' }),
      ).rejects.toThrow(RecursoNoEncontradoError);
    });
  });

  describe('agenda', () => {
    const rango = { inicio: new Date(), fin: new Date() };

    beforeEach(() => availability.rangoDeFecha.mockReturnValue(rango));

    it('sin fecha usa el día de la clínica según el reloj', async () => {
      availability.fechaClinica.mockReturnValue('2026-11-09');

      await service.agendaDelDia('d1');

      expect(availability.fechaClinica).toHaveBeenCalledWith(ahora);
      expect(availability.rangoDeFecha).toHaveBeenCalledWith('2026-11-09');
      expect(repository.findAgenda).toHaveBeenCalledWith('d1', rango);
    });

    it('con fecha usa esa fecha', async () => {
      await service.agendaDelDia('d1', '2026-11-12');

      expect(availability.fechaClinica).not.toHaveBeenCalled();
      expect(availability.rangoDeFecha).toHaveBeenCalledWith('2026-11-12');
    });

    it('las próximas se piden según la hora del reloj', async () => {
      await service.proximasDelOdontologo('d1', 10);

      expect(repository.findUpcoming).toHaveBeenCalledWith('d1', ahora, 10);
    });
  });

  describe('findAll', () => {
    const paginacion = { limit: 50, offset: 0 };

    it('no filtra por rango si no se indica una fecha', async () => {
      await service.findAll(paginacion);

      expect(availability.rangoDeFecha).not.toHaveBeenCalled();
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ rango: undefined, ...paginacion }),
      );
    });

    it('convierte la fecha al rango de ese día en la clínica', async () => {
      const rango = { inicio: new Date(), fin: new Date() };
      availability.rangoDeFecha.mockReturnValue(rango);

      await service.findAll({ ...paginacion, fecha: '2026-11-10' });

      expect(availability.rangoDeFecha).toHaveBeenCalledWith('2026-11-10');
      expect(repository.findAll).toHaveBeenCalledWith(expect.objectContaining({ rango }));
    });
  });
});
