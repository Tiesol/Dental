import { ServiceDisabledError } from '../../../common/errors/domain-error';
import { assertServiceEnabled, normalizeServiceName, canViewService } from './service-rules';

describe('assertServiceEnabled', () => {
  it('acepta un servicio habilitado', () => {
    expect(() => assertServiceEnabled({ activo: true })).not.toThrow();
  });

  it('rechaza un servicio deshabilitado para nuevas reservas', () => {
    expect(() => assertServiceEnabled({ activo: false })).toThrow(ServiceDisabledError);
  });
});

describe('canViewService', () => {
  it('el ADMIN ve un servicio deshabilitado, para gestionarlo', () => {
    expect(canViewService('ADMIN', { activo: false })).toBe(true);
  });

  it.each(['PACIENTE', 'ODONTOLOGO'] as const)('%s no ve un servicio deshabilitado', (role) => {
    expect(canViewService(role, { activo: false })).toBe(false);
  });

  it.each(['PACIENTE', 'ODONTOLOGO', 'ADMIN'] as const)('%s ve un servicio habilitado', (role) => {
    expect(canViewService(role, { activo: true })).toBe(true);
  });
});

describe('normalizeServiceName', () => {
  it('quita los espacios de los extremos y los repetidos', () => {
    expect(normalizeServiceName('  Limpieza    dental ')).toBe('Limpieza dental');
  });

  it('conserva las mayúsculas', () => {
    expect(normalizeServiceName('Ortodoncia')).toBe('Ortodoncia');
  });
});
