import { ConfigService } from '@nestjs/config';
import {
  BlockHasAppointmentsError,
  InvalidDateError,
  InvalidScheduleError,
  DentistDisabledError,
  DentistDoesNotOfferServiceError,
  ResourceNotFoundError,
  ServiceDisabledError,
} from '../../common/errors/domain-error';
import { DentistsService } from '../dentists/dentists.service';
import { ServicesService } from '../services/services.service';
import { AvailabilityRepository } from './availability.repository';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  const now = new Date('2026-11-09T14:00:00.000Z');
  const view = { horarios: [], bloques: [] };
  const withBlock = {
    horarios: [],
    bloques: [
      {
        id: 'b1',
        inicio: new Date('2026-11-10T14:00:00.000Z'),
        fin: new Date('2026-11-10T15:00:00.000Z'),
        motivo: 'Cirugía personal',
      },
    ],
  };
  const monday = { diaSemana: 1, minutoInicio: 540, minutoFin: 720 };
  const blockBody = { inicio: '2026-11-10T14:00:00.000Z', fin: '2026-11-10T15:00:00.000Z' };

  const repository = {
    findByDentist: jest.fn(),
    findSlotInputs: jest.fn(),
    replaceRules: jest.fn(),
    createBlockIfFree: jest.fn(),
    deleteBlock: jest.fn(),
  };
  const dentists = { findOne: jest.fn(), getOrThrow: jest.fn() };
  const services = { getOrThrow: jest.fn() };
  const config = { getOrThrow: () => 'America/La_Paz' };
  const service = new AvailabilityService(
    repository as unknown as AvailabilityRepository,
    dentists as unknown as DentistsService,
    services as unknown as ServicesService,
    { now: () => now },
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findByDentist.mockResolvedValue(view);
  });

  describe('findSlots', () => {
    const dentist = { activo: true, cuentaActiva: true, servicios: [{ id: 's1' }] };
    const dentalService = { id: 's1', activo: true, duracionMin: 30 };

    beforeEach(() => {
      dentists.getOrThrow.mockResolvedValue(dentist);
      services.getOrThrow.mockResolvedValue(dentalService);
      repository.findSlotInputs.mockResolvedValue({
        horarios: [{ diaSemana: 2, minutoInicio: 540, minutoFin: 570 }],
        bloques: [],
        citas: [],
      });
    });

    it('lee los datos del día de la semana de la fecha y calcula en la zona de la clínica', async () => {
      const slots = await service.findSlots('d1', 's1', '2026-11-10');

      expect(repository.findSlotInputs).toHaveBeenCalledWith(
        'd1',
        2,
        {
          inicio: new Date('2026-11-10T04:00:00.000Z'),
          fin: new Date('2026-11-11T04:00:00.000Z'),
        },
        { tx: undefined, excludeAppointmentId: undefined },
      );
      expect(slots).toEqual([
        { inicio: new Date('2026-11-10T13:00:00.000Z'), fin: new Date('2026-11-10T13:30:00.000Z') },
      ]);
    });

    it('rechaza una fecha inválida sin consultar nada', async () => {
      await expect(service.findSlots('d1', 's1', '2026-02-30')).rejects.toThrow(InvalidDateError);

      expect(services.getOrThrow).not.toHaveBeenCalled();
      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });

    it('no calcula horarios de un servicio deshabilitado', async () => {
      services.getOrThrow.mockResolvedValue({ ...dentalService, activo: false });

      await expect(service.findSlots('d1', 's1', '2026-11-10')).rejects.toThrow(
        ServiceDisabledError,
      );

      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });

    it('no calcula horarios de un odontólogo que no acepta citas', async () => {
      dentists.getOrThrow.mockResolvedValue({ ...dentist, activo: false });

      await expect(service.findSlots('d1', 's1', '2026-11-10')).rejects.toThrow(
        DentistDisabledError,
      );

      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });

    it('no calcula horarios de un servicio que el odontólogo no realiza', async () => {
      dentists.getOrThrow.mockResolvedValue({ ...dentist, servicios: [] });

      await expect(service.findSlots('d1', 's1', '2026-11-10')).rejects.toThrow(
        DentistDoesNotOfferServiceError,
      );

      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });
  });

  describe('clinicDate', () => {
    it('devuelve el día de la clínica de un instante nocturno', () => {
      expect(service.clinicDate(new Date('2026-11-11T02:00:00.000Z'))).toBe('2026-11-10');
    });
  });

  describe('find', () => {
    it('no consulta la disponibilidad de un odontólogo que el rol no puede ver', async () => {
      dentists.findOne.mockRejectedValue(new ResourceNotFoundError('Odontólogo'));

      await expect(service.find('d1', 'PACIENTE')).rejects.toThrow(ResourceNotFoundError);

      expect(dentists.findOne).toHaveBeenCalledWith('d1', 'PACIENTE');
      expect(repository.findByDentist).not.toHaveBeenCalled();
    });

    it('consulta los bloques vigentes según la hora del reloj', async () => {
      const result = await service.find('d1', 'PACIENTE');

      expect(result).toEqual(view);
      expect(repository.findByDentist).toHaveBeenCalledWith('d1', now);
    });

    it('entrega el motivo de los bloques al ADMIN', async () => {
      repository.findByDentist.mockResolvedValue(withBlock);

      const result = await service.find('d1', 'ADMIN');

      expect(result).toEqual(withBlock);
    });

    it.each(['PACIENTE', 'ODONTOLOGO'] as const)('oculta el motivo al rol %s', async (role) => {
      repository.findByDentist.mockResolvedValue(withBlock);

      const result = await service.find('d1', role);

      expect(result.bloques).toEqual([
        { id: 'b1', inicio: withBlock.bloques[0].inicio, fin: withBlock.bloques[0].fin },
      ]);
    });
  });

  describe('replaceSchedule', () => {
    it('guarda los horarios válidos y devuelve la disponibilidad actualizada', async () => {
      const result = await service.replaceSchedule('d1', [monday]);

      expect(repository.replaceRules).toHaveBeenCalledWith('d1', [monday]);
      expect(repository.findByDentist).toHaveBeenCalledWith('d1', now);
      expect(result).toEqual(view);
    });

    it('no guarda nada si los horarios son inválidos', async () => {
      const overlapping = [monday, { ...monday, minutoInicio: 600 }];

      await expect(service.replaceSchedule('d1', overlapping)).rejects.toThrow(
        InvalidScheduleError,
      );

      expect(repository.replaceRules).not.toHaveBeenCalled();
    });

    it('no guarda nada si el odontólogo no existe', async () => {
      dentists.findOne.mockRejectedValue(new ResourceNotFoundError('Odontólogo'));

      await expect(service.replaceSchedule('d1', [monday])).rejects.toThrow(ResourceNotFoundError);

      expect(repository.replaceRules).not.toHaveBeenCalled();
    });
  });

  describe('createBlock', () => {
    it('convierte las fechas y guarda el motivo como null si no se indica', async () => {
      const created = { id: 'b1', motivo: null };
      repository.createBlockIfFree.mockResolvedValue(created);

      const result = await service.createBlock('d1', blockBody);

      expect(result).toEqual(created);
      expect(repository.createBlockIfFree).toHaveBeenCalledWith('d1', {
        inicio: new Date(blockBody.inicio),
        fin: new Date(blockBody.fin),
        motivo: null,
      });
    });

    it('lanza BlockHasAppointmentsError si el repository no pudo crearlo', async () => {
      repository.createBlockIfFree.mockResolvedValue(null);

      await expect(service.createBlock('d1', blockBody)).rejects.toThrow(BlockHasAppointmentsError);
    });

    it('no intenta crear un bloque ya terminado', async () => {
      const ended = { inicio: '2026-11-08T14:00:00.000Z', fin: '2026-11-08T15:00:00.000Z' };

      await expect(service.createBlock('d1', ended)).rejects.toThrow(InvalidDateError);

      expect(repository.createBlockIfFree).not.toHaveBeenCalled();
    });

    it('no intenta crear el bloque si el odontólogo no existe', async () => {
      dentists.findOne.mockRejectedValue(new ResourceNotFoundError('Odontólogo'));

      await expect(service.createBlock('d1', blockBody)).rejects.toThrow(ResourceNotFoundError);

      expect(repository.createBlockIfFree).not.toHaveBeenCalled();
    });
  });

  describe('deleteBlock', () => {
    it('termina sin error si borró el bloque del odontólogo', async () => {
      repository.deleteBlock.mockResolvedValue(true);

      await expect(service.deleteBlock('d1', 'b1')).resolves.toBeUndefined();

      expect(repository.deleteBlock).toHaveBeenCalledWith('d1', 'b1');
    });

    it('lanza ResourceNotFoundError si no había nada que borrar', async () => {
      repository.deleteBlock.mockResolvedValue(false);

      await expect(service.deleteBlock('d1', 'b1')).rejects.toThrow(ResourceNotFoundError);
    });

    it('no borra nada si el odontólogo no existe', async () => {
      dentists.findOne.mockRejectedValue(new ResourceNotFoundError('Odontólogo'));

      await expect(service.deleteBlock('d1', 'b1')).rejects.toThrow(ResourceNotFoundError);

      expect(repository.deleteBlock).not.toHaveBeenCalled();
    });
  });
});
