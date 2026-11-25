import {
  AccessDeniedError,
  ObservationRequiredError,
  InvalidStatusTransitionError,
} from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { AppointmentStatus } from './appointment';
import { assertCanFinish, assertTransitionAllowed } from './appointment-status';

const STATUSES: AppointmentStatus[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'EN_ATENCION',
  'FINALIZADA',
  'CANCELADA',
];
const ROLES: Role[] = ['PACIENTE', 'ODONTOLOGO', 'ADMIN'];

// La tabla de ARQUITECTURA.md sección 6, escrita aparte del código para que el test la proteja.
const WHO_CAN: Partial<Record<string, Role[]>> = {
  'PENDIENTE>CONFIRMADA': ['ODONTOLOGO', 'ADMIN'],
  'CONFIRMADA>EN_ATENCION': ['ODONTOLOGO'],
  'EN_ATENCION>FINALIZADA': ['ODONTOLOGO'],
  'PENDIENTE>CANCELADA': ['PACIENTE', 'ADMIN'],
  'CONFIRMADA>CANCELADA': ['PACIENTE', 'ADMIN'],
};

const cases = STATUSES.flatMap((from) =>
  STATUSES.flatMap((to) => ROLES.map((role) => ({ from, to, role }))),
);
const roles = (c: { from: string; to: string }) => WHO_CAN[`${c.from}>${c.to}`];

describe('assertTransitionAllowed', () => {
  it.each(cases.filter((c) => roles(c)?.includes(c.role)))(
    'permite $from -> $to al rol $role',
    ({ from, to, role }) => {
      expect(() => assertTransitionAllowed(from, to, role)).not.toThrow();
    },
  );

  it.each(cases.filter((c) => roles(c) && !roles(c)?.includes(c.role)))(
    'rechaza con 403 que el rol $role haga $from -> $to',
    ({ from, to, role }) => {
      expect(() => assertTransitionAllowed(from, to, role)).toThrow(AccessDeniedError);
    },
  );

  it.each(cases.filter((c) => !roles(c)))(
    'rechaza con 409 la transición inexistente $from -> $to para $role',
    ({ from, to, role }) => {
      expect(() => assertTransitionAllowed(from, to, role)).toThrow(InvalidStatusTransitionError);
    },
  );

  it('una cita FINALIZADA no vuelve a PENDIENTE ni para el ADMIN', () => {
    expect(() => assertTransitionAllowed('FINALIZADA', 'PENDIENTE', 'ADMIN')).toThrow(
      InvalidStatusTransitionError,
    );
  });

  it('el rol ODONTOLOGO puede pasar PENDIENTE -> CONFIRMADA; la propiedad la revisa el service (D2)', () => {
    expect(() => assertTransitionAllowed('PENDIENTE', 'CONFIRMADA', 'ODONTOLOGO')).not.toThrow();
  });
});

describe('assertCanFinish', () => {
  it('rechaza finalizar sin observación', () => {
    expect(() => assertCanFinish('FINALIZADA', null)).toThrow(ObservationRequiredError);
  });

  it('permite finalizar con observación', () => {
    expect(() => assertCanFinish('FINALIZADA', { texto: 'Sin novedades' })).not.toThrow();
  });

  it.each(['CONFIRMADA', 'EN_ATENCION'] as const)('no exige observación para pasar a %s', (to) => {
    expect(() => assertCanFinish(to, null)).not.toThrow();
  });
});
