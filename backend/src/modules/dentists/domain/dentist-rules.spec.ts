import {
  DentistDisabledError,
  DentistDoesNotOfferServiceError,
} from '../../../common/errors/domain-error';
import { DentistRecord } from './dentist';
import {
  acceptsNewAppointments,
  assertDentistAcceptsAppointments,
  assertOffersService,
  uniqueIds,
  canViewDentist,
  offersService,
  toPublicView,
} from './dentist-rules';

const cleaning = { id: 's1', nombre: 'Limpieza', duracionMin: 30, activo: true };
const whitening = { id: 's2', nombre: 'Blanqueamiento', duracionMin: 60, activo: false };

const dentist: DentistRecord = {
  id: 'd1',
  userId: 'u1',
  email: 'laura@clinica.com',
  cuentaActiva: true,
  nombre: 'Dra. Laura',
  especialidad: 'General',
  activo: true,
  servicios: [cleaning, whitening],
};

describe('acceptsNewAppointments', () => {
  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false],
    [false, false, false],
  ])('activo=%s y cuentaActiva=%s da %s', (active, accountActive, expected) => {
    expect(acceptsNewAppointments({ activo: active, cuentaActiva: accountActive })).toBe(expected);
  });
});

describe('assertDentistAcceptsAppointments', () => {
  it('acepta a un odontólogo habilitado', () => {
    expect(() => assertDentistAcceptsAppointments(dentist)).not.toThrow();
  });

  it('rechaza a un profesional deshabilitado', () => {
    expect(() => assertDentistAcceptsAppointments({ ...dentist, activo: false })).toThrow(
      DentistDisabledError,
    );
  });

  it('rechaza a un profesional con la cuenta deshabilitada', () => {
    expect(() => assertDentistAcceptsAppointments({ ...dentist, cuentaActiva: false })).toThrow(
      DentistDisabledError,
    );
  });
});

describe('assertOffersService', () => {
  it('acepta un servicio que el odontólogo realiza', () => {
    expect(() => assertOffersService(dentist, 's1')).not.toThrow();
  });

  it('rechaza un servicio que el odontólogo no realiza', () => {
    expect(() => assertOffersService(dentist, 'otro')).toThrow(DentistDoesNotOfferServiceError);
  });

  it('rechaza cualquier servicio si no tiene ninguno asignado', () => {
    expect(() => assertOffersService({ servicios: [] }, 's1')).toThrow(
      DentistDoesNotOfferServiceError,
    );
  });
});

describe('offersService', () => {
  it('distingue entre un servicio asignado y uno que no lo está', () => {
    expect(offersService(dentist, 's2')).toBe(true);
    expect(offersService(dentist, 's3')).toBe(false);
  });
});

describe('canViewDentist', () => {
  const disabled = { activo: false, cuentaActiva: true };

  it('el ADMIN ve a un odontólogo deshabilitado', () => {
    expect(canViewDentist('ADMIN', disabled)).toBe(true);
  });

  it.each(['PACIENTE', 'ODONTOLOGO'] as const)('%s no ve a un odontólogo deshabilitado', (role) => {
    expect(canViewDentist(role, disabled)).toBe(false);
  });

  it('un paciente ve a un odontólogo que acepta citas', () => {
    expect(canViewDentist('PACIENTE', { activo: true, cuentaActiva: true })).toBe(true);
  });
});

describe('toPublicView', () => {
  it('oculta los datos de la cuenta y solo lista servicios habilitados', () => {
    expect(toPublicView(dentist)).toEqual({
      id: 'd1',
      nombre: 'Dra. Laura',
      especialidad: 'General',
      servicios: [{ id: 's1', nombre: 'Limpieza', duracionMin: 30 }],
    });
  });
});

describe('uniqueIds', () => {
  it('quita repetidos y conserva el orden de llegada', () => {
    expect(uniqueIds(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });
});
