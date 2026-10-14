import { nombreParaMostrar, toPublicUser } from './public-user';
import { UserRecord } from './user';

function usuario(extra: Partial<UserRecord> = {}): UserRecord {
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

describe('nombreParaMostrar', () => {
  it('para un paciente une nombre y apellido', () => {
    expect(nombreParaMostrar(usuario())).toBe('Ana Pérez');
  });

  it('para un odontólogo usa el nombre del perfil de odontólogo', () => {
    const odontologo = usuario({
      role: 'ODONTOLOGO',
      patient: null,
      dentist: { id: 'd1', nombre: 'Dra. Laura Gómez', especialidad: 'General', activo: true },
    });

    expect(nombreParaMostrar(odontologo)).toBe('Dra. Laura Gómez');
  });

  it('para un administrador sin perfil devuelve el rótulo fijo', () => {
    expect(nombreParaMostrar(usuario({ role: 'ADMIN', patient: null }))).toBe('Administrador');
  });
});

describe('toPublicUser', () => {
  it('no incluye passwordHash', () => {
    const publico = toPublicUser(usuario());

    expect(publico).not.toHaveProperty('passwordHash');
  });

  it('incluye patientId cuando el usuario es paciente y omite dentistId', () => {
    const publico = toPublicUser(usuario());

    expect(publico).toMatchObject({ id: 'u1', role: 'PACIENTE', patientId: 'p1' });
    expect(publico).not.toHaveProperty('dentistId');
  });

  it('incluye dentistId cuando el usuario es odontólogo y omite patientId', () => {
    const publico = toPublicUser(
      usuario({
        role: 'ODONTOLOGO',
        patient: null,
        dentist: { id: 'd1', nombre: 'Dra. Laura Gómez', especialidad: 'General', activo: true },
      }),
    );

    expect(publico).toMatchObject({ role: 'ODONTOLOGO', dentistId: 'd1' });
    expect(publico).not.toHaveProperty('patientId');
  });
});
