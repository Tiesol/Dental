import {
  OdontologoDeshabilitadoError,
  OdontologoNoRealizaServicioError,
} from '../../../common/errors/domain-error';
import { DentistRecord } from './dentist';
import {
  aceptaNuevasCitas,
  assertOdontologoAceptaCitas,
  assertRealizaServicio,
  idsUnicos,
  puedeVerOdontologo,
  realizaServicio,
  toPublicView,
} from './dentist-rules';

const limpieza = { id: 's1', nombre: 'Limpieza', duracionMin: 30, activo: true };
const blanqueamiento = { id: 's2', nombre: 'Blanqueamiento', duracionMin: 60, activo: false };

const odontologo: DentistRecord = {
  id: 'd1',
  userId: 'u1',
  email: 'laura@clinica.com',
  cuentaActiva: true,
  nombre: 'Dra. Laura',
  especialidad: 'General',
  activo: true,
  servicios: [limpieza, blanqueamiento],
};

describe('aceptaNuevasCitas', () => {
  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false],
    [false, false, false],
  ])('activo=%s y cuentaActiva=%s da %s', (activo, cuentaActiva, esperado) => {
    expect(aceptaNuevasCitas({ activo, cuentaActiva })).toBe(esperado);
  });
});

describe('assertOdontologoAceptaCitas', () => {
  it('acepta a un odontólogo habilitado', () => {
    expect(() => assertOdontologoAceptaCitas(odontologo)).not.toThrow();
  });

  it('rechaza a un profesional deshabilitado', () => {
    expect(() => assertOdontologoAceptaCitas({ ...odontologo, activo: false })).toThrow(
      OdontologoDeshabilitadoError,
    );
  });

  it('rechaza a un profesional con la cuenta deshabilitada', () => {
    expect(() => assertOdontologoAceptaCitas({ ...odontologo, cuentaActiva: false })).toThrow(
      OdontologoDeshabilitadoError,
    );
  });
});

describe('assertRealizaServicio', () => {
  it('acepta un servicio que el odontólogo realiza', () => {
    expect(() => assertRealizaServicio(odontologo, 's1')).not.toThrow();
  });

  it('rechaza un servicio que el odontólogo no realiza', () => {
    expect(() => assertRealizaServicio(odontologo, 'otro')).toThrow(
      OdontologoNoRealizaServicioError,
    );
  });

  it('rechaza cualquier servicio si no tiene ninguno asignado', () => {
    expect(() => assertRealizaServicio({ servicios: [] }, 's1')).toThrow(
      OdontologoNoRealizaServicioError,
    );
  });
});

describe('realizaServicio', () => {
  it('distingue entre un servicio asignado y uno que no lo está', () => {
    expect(realizaServicio(odontologo, 's2')).toBe(true);
    expect(realizaServicio(odontologo, 's3')).toBe(false);
  });
});

describe('puedeVerOdontologo', () => {
  const deshabilitado = { activo: false, cuentaActiva: true };

  it('el ADMIN ve a un odontólogo deshabilitado', () => {
    expect(puedeVerOdontologo('ADMIN', deshabilitado)).toBe(true);
  });

  it.each(['PACIENTE', 'ODONTOLOGO'] as const)('%s no ve a un odontólogo deshabilitado', (rol) => {
    expect(puedeVerOdontologo(rol, deshabilitado)).toBe(false);
  });

  it('un paciente ve a un odontólogo que acepta citas', () => {
    expect(puedeVerOdontologo('PACIENTE', { activo: true, cuentaActiva: true })).toBe(true);
  });
});

describe('toPublicView', () => {
  it('oculta los datos de la cuenta y solo lista servicios habilitados', () => {
    expect(toPublicView(odontologo)).toEqual({
      id: 'd1',
      nombre: 'Dra. Laura',
      especialidad: 'General',
      servicios: [{ id: 's1', nombre: 'Limpieza', duracionMin: 30 }],
    });
  });
});

describe('idsUnicos', () => {
  it('quita repetidos y conserva el orden de llegada', () => {
    expect(idsUnicos(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });
});
