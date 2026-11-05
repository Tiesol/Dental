import { ConfigService } from '@nestjs/config';
import {
  BloqueConCitasError,
  FechaInvalidaError,
  HorarioInvalidoError,
  OdontologoDeshabilitadoError,
  OdontologoNoRealizaServicioError,
  RecursoNoEncontradoError,
  ServicioDeshabilitadoError,
} from '../../common/errors/domain-error';
import { DentistsService } from '../dentists/dentists.service';
import { ServicesService } from '../services/services.service';
import { AvailabilityRepository } from './availability.repository';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  const ahora = new Date('2026-11-09T14:00:00.000Z');
  const vista = { horarios: [], bloques: [] };
  const conBloque = {
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
  const lunes = { diaSemana: 1, minutoInicio: 540, minutoFin: 720 };
  const cuerpoBloque = { inicio: '2026-11-10T14:00:00.000Z', fin: '2026-11-10T15:00:00.000Z' };

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
    { now: () => ahora },
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findByDentist.mockResolvedValue(vista);
  });

  describe('findSlots', () => {
    const odontologo = { activo: true, cuentaActiva: true, servicios: [{ id: 's1' }] };
    const servicio = { id: 's1', activo: true, duracionMin: 30 };

    beforeEach(() => {
      dentists.getOrThrow.mockResolvedValue(odontologo);
      services.getOrThrow.mockResolvedValue(servicio);
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
        { tx: undefined, excluirCitaId: undefined },
      );
      expect(slots).toEqual([
        { inicio: new Date('2026-11-10T13:00:00.000Z'), fin: new Date('2026-11-10T13:30:00.000Z') },
      ]);
    });

    it('rechaza una fecha inválida sin consultar nada', async () => {
      await expect(service.findSlots('d1', 's1', '2026-02-30')).rejects.toThrow(FechaInvalidaError);

      expect(services.getOrThrow).not.toHaveBeenCalled();
      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });

    it('no calcula horarios de un servicio deshabilitado', async () => {
      services.getOrThrow.mockResolvedValue({ ...servicio, activo: false });

      await expect(service.findSlots('d1', 's1', '2026-11-10')).rejects.toThrow(
        ServicioDeshabilitadoError,
      );

      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });

    it('no calcula horarios de un odontólogo que no acepta citas', async () => {
      dentists.getOrThrow.mockResolvedValue({ ...odontologo, activo: false });

      await expect(service.findSlots('d1', 's1', '2026-11-10')).rejects.toThrow(
        OdontologoDeshabilitadoError,
      );

      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });

    it('no calcula horarios de un servicio que el odontólogo no realiza', async () => {
      dentists.getOrThrow.mockResolvedValue({ ...odontologo, servicios: [] });

      await expect(service.findSlots('d1', 's1', '2026-11-10')).rejects.toThrow(
        OdontologoNoRealizaServicioError,
      );

      expect(repository.findSlotInputs).not.toHaveBeenCalled();
    });
  });

  describe('fechaClinica', () => {
    it('devuelve el día de la clínica de un instante nocturno', () => {
      expect(service.fechaClinica(new Date('2026-11-11T02:00:00.000Z'))).toBe('2026-11-10');
    });
  });

  describe('find', () => {
    it('no consulta la disponibilidad de un odontólogo que el rol no puede ver', async () => {
      dentists.findOne.mockRejectedValue(new RecursoNoEncontradoError('Odontólogo'));

      await expect(service.find('d1', 'PACIENTE')).rejects.toThrow(RecursoNoEncontradoError);

      expect(dentists.findOne).toHaveBeenCalledWith('d1', 'PACIENTE');
      expect(repository.findByDentist).not.toHaveBeenCalled();
    });

    it('consulta los bloques vigentes según la hora del reloj', async () => {
      const resultado = await service.find('d1', 'PACIENTE');

      expect(resultado).toEqual(vista);
      expect(repository.findByDentist).toHaveBeenCalledWith('d1', ahora);
    });

    it('entrega el motivo de los bloques al ADMIN', async () => {
      repository.findByDentist.mockResolvedValue(conBloque);

      const resultado = await service.find('d1', 'ADMIN');

      expect(resultado).toEqual(conBloque);
    });

    it.each(['PACIENTE', 'ODONTOLOGO'] as const)('oculta el motivo al rol %s', async (rol) => {
      repository.findByDentist.mockResolvedValue(conBloque);

      const resultado = await service.find('d1', rol);

      expect(resultado.bloques).toEqual([
        { id: 'b1', inicio: conBloque.bloques[0].inicio, fin: conBloque.bloques[0].fin },
      ]);
    });
  });

  describe('replaceHorarios', () => {
    it('guarda los horarios válidos y devuelve la disponibilidad actualizada', async () => {
      const resultado = await service.replaceHorarios('d1', [lunes]);

      expect(repository.replaceRules).toHaveBeenCalledWith('d1', [lunes]);
      expect(repository.findByDentist).toHaveBeenCalledWith('d1', ahora);
      expect(resultado).toEqual(vista);
    });

    it('no guarda nada si los horarios son inválidos', async () => {
      const solapados = [lunes, { ...lunes, minutoInicio: 600 }];

      await expect(service.replaceHorarios('d1', solapados)).rejects.toThrow(HorarioInvalidoError);

      expect(repository.replaceRules).not.toHaveBeenCalled();
    });

    it('no guarda nada si el odontólogo no existe', async () => {
      dentists.findOne.mockRejectedValue(new RecursoNoEncontradoError('Odontólogo'));

      await expect(service.replaceHorarios('d1', [lunes])).rejects.toThrow(
        RecursoNoEncontradoError,
      );

      expect(repository.replaceRules).not.toHaveBeenCalled();
    });
  });

  describe('createBlock', () => {
    it('convierte las fechas y guarda el motivo como null si no se indica', async () => {
      const creado = { id: 'b1', motivo: null };
      repository.createBlockIfFree.mockResolvedValue(creado);

      const resultado = await service.createBlock('d1', cuerpoBloque);

      expect(resultado).toEqual(creado);
      expect(repository.createBlockIfFree).toHaveBeenCalledWith('d1', {
        inicio: new Date(cuerpoBloque.inicio),
        fin: new Date(cuerpoBloque.fin),
        motivo: null,
      });
    });

    it('lanza BloqueConCitasError si el repository no pudo crearlo', async () => {
      repository.createBlockIfFree.mockResolvedValue(null);

      await expect(service.createBlock('d1', cuerpoBloque)).rejects.toThrow(BloqueConCitasError);
    });

    it('no intenta crear un bloque ya terminado', async () => {
      const terminado = { inicio: '2026-11-08T14:00:00.000Z', fin: '2026-11-08T15:00:00.000Z' };

      await expect(service.createBlock('d1', terminado)).rejects.toThrow(FechaInvalidaError);

      expect(repository.createBlockIfFree).not.toHaveBeenCalled();
    });

    it('no intenta crear el bloque si el odontólogo no existe', async () => {
      dentists.findOne.mockRejectedValue(new RecursoNoEncontradoError('Odontólogo'));

      await expect(service.createBlock('d1', cuerpoBloque)).rejects.toThrow(
        RecursoNoEncontradoError,
      );

      expect(repository.createBlockIfFree).not.toHaveBeenCalled();
    });
  });

  describe('deleteBlock', () => {
    it('termina sin error si borró el bloque del odontólogo', async () => {
      repository.deleteBlock.mockResolvedValue(true);

      await expect(service.deleteBlock('d1', 'b1')).resolves.toBeUndefined();

      expect(repository.deleteBlock).toHaveBeenCalledWith('d1', 'b1');
    });

    it('lanza RecursoNoEncontradoError si no había nada que borrar', async () => {
      repository.deleteBlock.mockResolvedValue(false);

      await expect(service.deleteBlock('d1', 'b1')).rejects.toThrow(RecursoNoEncontradoError);
    });

    it('no borra nada si el odontólogo no existe', async () => {
      dentists.findOne.mockRejectedValue(new RecursoNoEncontradoError('Odontólogo'));

      await expect(service.deleteBlock('d1', 'b1')).rejects.toThrow(RecursoNoEncontradoError);

      expect(repository.deleteBlock).not.toHaveBeenCalled();
    });
  });
});
