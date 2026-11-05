import {
  AccesoDenegadoError,
  ObservacionRequeridaError,
  TransicionDeEstadoInvalidaError,
} from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { AppointmentStatus } from './appointment';
import { assertPuedeFinalizar, assertTransicionPermitida } from './appointment-status';

const ESTADOS: AppointmentStatus[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'EN_ATENCION',
  'FINALIZADA',
  'CANCELADA',
];
const ROLES: Role[] = ['PACIENTE', 'ODONTOLOGO', 'ADMIN'];

// La tabla de ARQUITECTURA.md sección 6, escrita aparte del código para que el test la proteja.
const QUIEN_PUEDE: Partial<Record<string, Role[]>> = {
  'PENDIENTE>CONFIRMADA': ['ADMIN'],
  'CONFIRMADA>EN_ATENCION': ['ODONTOLOGO'],
  'EN_ATENCION>FINALIZADA': ['ODONTOLOGO'],
  'PENDIENTE>CANCELADA': ['PACIENTE', 'ADMIN'],
  'CONFIRMADA>CANCELADA': ['PACIENTE', 'ADMIN'],
};

const casos = ESTADOS.flatMap((desde) =>
  ESTADOS.flatMap((hacia) => ROLES.map((rol) => ({ desde, hacia, rol }))),
);
const roles = (c: { desde: string; hacia: string }) => QUIEN_PUEDE[`${c.desde}>${c.hacia}`];

describe('assertTransicionPermitida', () => {
  it.each(casos.filter((c) => roles(c)?.includes(c.rol)))(
    'permite $desde -> $hacia al rol $rol',
    ({ desde, hacia, rol }) => {
      expect(() => assertTransicionPermitida(desde, hacia, rol)).not.toThrow();
    },
  );

  it.each(casos.filter((c) => roles(c) && !roles(c)?.includes(c.rol)))(
    'rechaza con 403 que el rol $rol haga $desde -> $hacia',
    ({ desde, hacia, rol }) => {
      expect(() => assertTransicionPermitida(desde, hacia, rol)).toThrow(AccesoDenegadoError);
    },
  );

  it.each(casos.filter((c) => !roles(c)))(
    'rechaza con 409 la transición inexistente $desde -> $hacia para $rol',
    ({ desde, hacia, rol }) => {
      expect(() => assertTransicionPermitida(desde, hacia, rol)).toThrow(
        TransicionDeEstadoInvalidaError,
      );
    },
  );

  it('una cita FINALIZADA no vuelve a PENDIENTE ni para el ADMIN', () => {
    expect(() => assertTransicionPermitida('FINALIZADA', 'PENDIENTE', 'ADMIN')).toThrow(
      TransicionDeEstadoInvalidaError,
    );
  });

  it('el odontólogo no confirma sus citas PENDIENTE (D2)', () => {
    expect(() => assertTransicionPermitida('PENDIENTE', 'CONFIRMADA', 'ODONTOLOGO')).toThrow(
      AccesoDenegadoError,
    );
  });
});

describe('assertPuedeFinalizar', () => {
  it('rechaza finalizar sin observación', () => {
    expect(() => assertPuedeFinalizar('FINALIZADA', null)).toThrow(ObservacionRequeridaError);
  });

  it('permite finalizar con observación', () => {
    expect(() => assertPuedeFinalizar('FINALIZADA', { texto: 'Sin novedades' })).not.toThrow();
  });

  it.each(['CONFIRMADA', 'EN_ATENCION'] as const)(
    'no exige observación para pasar a %s',
    (hacia) => {
      expect(() => assertPuedeFinalizar(hacia, null)).not.toThrow();
    },
  );
});
