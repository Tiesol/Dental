import { displayName, toPublicUser } from './public-user';
import { UserRecord } from './user';

function buildUser(extra: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'u1',
    email: 'ana@mail.com',
    passwordHash: '$2a$04$hash',
    role: 'PACIENTE',
    activo: true,
    createdAt: new Date('2026-10-14T00:00:00Z'),
    patient: { id: 'p1', nombre: 'Ana', apellido: 'Pérez', telefono: null },
    dentist: null,
    ...extra,
  };
}

describe('displayName', () => {
  it('para un paciente une nombre y apellido', () => {
    expect(displayName(buildUser())).toBe('Ana Pérez');
  });

  it('para un odontólogo usa el nombre del perfil de odontólogo', () => {
    const dentist = buildUser({
      role: 'ODONTOLOGO',
      patient: null,
      dentist: { id: 'd1', nombre: 'Dra. Laura Gómez', especialidad: 'General', activo: true },
    });

    expect(displayName(dentist)).toBe('Dra. Laura Gómez');
  });

  it('para un administrador sin perfil devuelve el rótulo fijo', () => {
    expect(displayName(buildUser({ role: 'ADMIN', patient: null }))).toBe('Administrador');
  });
});

describe('toPublicUser', () => {
  it('no incluye passwordHash', () => {
    const publicView = toPublicUser(buildUser());

    expect(publicView).not.toHaveProperty('passwordHash');
  });

  it('incluye patientId cuando el usuario es paciente y omite dentistId', () => {
    const publicView = toPublicUser(buildUser());

    expect(publicView).toMatchObject({ id: 'u1', role: 'PACIENTE', patientId: 'p1' });
    expect(publicView).not.toHaveProperty('dentistId');
  });

  it('incluye dentistId cuando el usuario es odontólogo y omite patientId', () => {
    const publicView = toPublicUser(
      buildUser({
        role: 'ODONTOLOGO',
        patient: null,
        dentist: { id: 'd1', nombre: 'Dra. Laura Gómez', especialidad: 'General', activo: true },
      }),
    );

    expect(publicView).toMatchObject({ role: 'ODONTOLOGO', dentistId: 'd1' });
    expect(publicView).not.toHaveProperty('patientId');
  });
});
