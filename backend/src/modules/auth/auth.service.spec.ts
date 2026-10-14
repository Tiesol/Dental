import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare, hash } from 'bcryptjs';
import {
  CredencialesInvalidasError,
  EmailYaRegistradoError,
  UsuarioNoDisponibleError,
} from '../../common/errors/domain-error';
import { NewPatientUser, UserRecord } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findByEmail: jest.fn<Promise<UserRecord | null>, [string]>(),
    findById: jest.fn<Promise<UserRecord | null>, [string]>(),
    createPatient: jest.fn<Promise<UserRecord>, [NewPatientUser]>(),
  };
  const jwt = { signAsync: jest.fn<Promise<string>, [object]>() };

  const registro = {
    email: 'ana@mail.com',
    password: 'secreta123',
    nombre: 'Ana',
    apellido: 'Pérez',
  };

  function usuarioGuardado(extra: Partial<UserRecord> = {}): UserRecord {
    return {
      id: 'u1',
      email: 'ana@mail.com',
      passwordHash: '',
      role: 'PACIENTE',
      activo: true,
      createdAt: new Date('2026-10-14T00:00:00Z'),
      patient: { id: 'p1', nombre: 'Ana', apellido: 'Pérez', telefono: null },
      dentist: null,
      ...extra,
    };
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    users.findByEmail.mockResolvedValue(null);
    users.createPatient.mockImplementation((data) =>
      Promise.resolve(
        usuarioGuardado({
          email: data.email,
          passwordHash: data.passwordHash,
          patient: {
            id: 'p1',
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono ?? null,
          },
        }),
      ),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: PasswordHasher, useValue: new PasswordHasher(4) },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  const datosCreados = () => users.createPatient.mock.calls[0][0];

  describe('register', () => {
    it('crea el usuario con la contraseña hasheada, nunca en claro', async () => {
      await service.register(registro);

      const data = datosCreados();
      expect(data.passwordHash).not.toBe(registro.password);
      expect(await compare(registro.password, data.passwordHash)).toBe(true);
    });

    it('normaliza el email a minúsculas y sin espacios', async () => {
      await service.register({ ...registro, email: '  Ana@MAIL.com ' });

      expect(datosCreados().email).toBe('ana@mail.com');
    });

    it('crea un paciente con nombre, apellido y teléfono aunque el cliente intente mandar un rol', async () => {
      await service.register({ ...registro, telefono: '700', role: 'ADMIN' } as never);

      expect(datosCreados()).toMatchObject({ nombre: 'Ana', apellido: 'Pérez', telefono: '700' });
      expect(datosCreados()).not.toHaveProperty('role');
    });

    it('lanza EmailYaRegistradoError si el email ya existe y no crea nada', async () => {
      users.findByEmail.mockResolvedValue(usuarioGuardado({ id: 'otro' }));

      await expect(service.register(registro)).rejects.toBeInstanceOf(EmailYaRegistradoError);
      expect(users.createPatient).not.toHaveBeenCalled();
    });

    it('devuelve el usuario público: sin passwordHash, con rol PACIENTE y nombre completo', async () => {
      const user = await service.register(registro);

      expect(user).not.toHaveProperty('passwordHash');
      expect(user).toMatchObject({
        email: 'ana@mail.com',
        role: 'PACIENTE',
        nombre: 'Ana Pérez',
        patientId: 'p1',
      });
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      users.findByEmail.mockResolvedValue(
        usuarioGuardado({ passwordHash: await hash('secreta123', 4) }),
      );
      jwt.signAsync.mockResolvedValue('token-firmado');
    });

    it('devuelve accessToken con payload { sub, email, role, patientId } si las credenciales son correctas', async () => {
      const result = await service.login({ email: 'ANA@mail.com', password: 'secreta123' });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'ana@mail.com',
        role: 'PACIENTE',
        patientId: 'p1',
      });
      expect(result.accessToken).toBe('token-firmado');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('lanza CredencialesInvalidasError si el email no existe', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nadie@mail.com', password: 'secreta123' }),
      ).rejects.toBeInstanceOf(CredencialesInvalidasError);
    });

    it('lanza CredencialesInvalidasError si la contraseña es incorrecta y no firma token', async () => {
      await expect(
        service.login({ email: 'ana@mail.com', password: 'incorrecta' }),
      ).rejects.toBeInstanceOf(CredencialesInvalidasError);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('lanza CredencialesInvalidasError si el usuario está inactivo', async () => {
      users.findByEmail.mockResolvedValue(
        usuarioGuardado({ activo: false, passwordHash: await hash('secreta123', 4) }),
      );

      await expect(
        service.login({ email: 'ana@mail.com', password: 'secreta123' }),
      ).rejects.toBeInstanceOf(CredencialesInvalidasError);
    });
  });

  describe('me', () => {
    it('devuelve el usuario público si existe y está activo', async () => {
      users.findById.mockResolvedValue(usuarioGuardado());

      const user = await service.me('u1');

      expect(user).toMatchObject({ id: 'u1', nombre: 'Ana Pérez' });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('lanza UsuarioNoDisponibleError si el usuario no existe o está inactivo', async () => {
      users.findById.mockResolvedValueOnce(null);
      await expect(service.me('u1')).rejects.toBeInstanceOf(UsuarioNoDisponibleError);

      users.findById.mockResolvedValueOnce(usuarioGuardado({ activo: false }));
      await expect(service.me('u1')).rejects.toBeInstanceOf(UsuarioNoDisponibleError);
    });
  });
});
