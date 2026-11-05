import { ServicioDeshabilitadoError } from '../../../common/errors/domain-error';
import {
  assertServicioHabilitado,
  normalizarNombreServicio,
  puedeVerServicio,
} from './service-rules';

describe('assertServicioHabilitado', () => {
  it('acepta un servicio habilitado', () => {
    expect(() => assertServicioHabilitado({ activo: true })).not.toThrow();
  });

  it('rechaza un servicio deshabilitado para nuevas reservas', () => {
    expect(() => assertServicioHabilitado({ activo: false })).toThrow(ServicioDeshabilitadoError);
  });
});

describe('puedeVerServicio', () => {
  it('el ADMIN ve un servicio deshabilitado, para gestionarlo', () => {
    expect(puedeVerServicio('ADMIN', { activo: false })).toBe(true);
  });

  it.each(['PACIENTE', 'ODONTOLOGO'] as const)('%s no ve un servicio deshabilitado', (rol) => {
    expect(puedeVerServicio(rol, { activo: false })).toBe(false);
  });

  it.each(['PACIENTE', 'ODONTOLOGO', 'ADMIN'] as const)('%s ve un servicio habilitado', (rol) => {
    expect(puedeVerServicio(rol, { activo: true })).toBe(true);
  });
});

describe('normalizarNombreServicio', () => {
  it('quita los espacios de los extremos y los repetidos', () => {
    expect(normalizarNombreServicio('  Limpieza    dental ')).toBe('Limpieza dental');
  });

  it('conserva las mayúsculas', () => {
    expect(normalizarNombreServicio('Ortodoncia')).toBe('Ortodoncia');
  });
});
