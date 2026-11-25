import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare, hash } from 'bcryptjs';
import {
  InvalidCredentialsError,
  EmailAlreadyRegisteredError,
  UserUnavailableError,
} from '../../common/errors/domain-error';
import { NewPatientUser, UserRecord } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordHasher } from '../../common/security/password-hasher';

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findByEmail: jest.fn<Promise<UserRecord | null>, [string]>(),
    findById: jest.fn<Promise<UserRecord | null>, [string]>(),
    createPatient: jest.fn<Promise<UserRecord>, [NewPatientUser]>(),
  };
  const jwt = { signAsync: jest.fn<Promise<string>, [object]>() };

  const registration = {
    email: 'ana@mail.com',
    password: 'secreta123',
    nombre: 'Ana',
    apellido: 'Pérez',
  };

  function savedUser(extra: Partial<UserRecord> = {}): UserRecord {
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
        savedUser({
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

  const createdData = () => users.createPatient.mock.calls[0][0];

  describe('register', () => {
    it('crea el usuario con la contraseña hasheada, nunca en claro', async () => {
      await service.register(registration);

      const data = createdData();
      expect(data.passwordHash).not.toBe(registration.password);
      expect(await compare(registration.password, data.passwordHash)).toBe(true);
    });

    it('normaliza el email a minúsculas y sin espacios', async () => {
      await service.register({ ...registration, email: '  Ana@MAIL.com ' });

      expect(createdData().email).toBe('ana@mail.com');
    });

    it('crea un paciente con nombre, apellido y teléfono aunque el cliente intente mandar un rol', async () => {
      await service.register({ ...registration, telefono: '700', role: 'ADMIN' } as never);

      expect(createdData()).toMatchObject({ nombre: 'Ana', apellido: 'Pérez', telefono: '700' });
      expect(createdData()).not.toHaveProperty('role');
    });

    it('lanza EmailAlreadyRegisteredError si el email ya existe y no crea nada', async () => {
      users.findByEmail.mockResolvedValue(savedUser({ id: 'otro' }));

      await expect(service.register(registration)).rejects.toBeInstanceOf(
        EmailAlreadyRegisteredError,
      );
      expect(users.createPatient).not.toHaveBeenCalled();
    });

    it('devuelve el usuario público: sin passwordHash, con rol PACIENTE y nombre completo', async () => {
      const user = await service.register(registration);

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
      users.findByEmail.mockResolvedValue(savedUser({ passwordHash: await hash('secreta123', 4) }));
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

    it('lanza InvalidCredentialsError si el email no existe', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nadie@mail.com', password: 'secreta123' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('lanza InvalidCredentialsError si la contraseña es incorrecta y no firma token', async () => {
      await expect(
        service.login({ email: 'ana@mail.com', password: 'incorrecta' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('lanza InvalidCredentialsError si el usuario está inactivo', async () => {
      users.findByEmail.mockResolvedValue(
        savedUser({ activo: false, passwordHash: await hash('secreta123', 4) }),
      );

      await expect(
        service.login({ email: 'ana@mail.com', password: 'secreta123' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
  });

  describe('me', () => {
    it('devuelve el usuario público si existe y está activo', async () => {
      users.findById.mockResolvedValue(savedUser());

      const user = await service.me('u1');

      expect(user).toMatchObject({ id: 'u1', nombre: 'Ana Pérez' });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('lanza UserUnavailableError si el usuario no existe o está inactivo', async () => {
      users.findById.mockResolvedValueOnce(null);
      await expect(service.me('u1')).rejects.toBeInstanceOf(UserUnavailableError);

      users.findById.mockResolvedValueOnce(savedUser({ activo: false }));
      await expect(service.me('u1')).rejects.toBeInstanceOf(UserUnavailableError);
    });
  });
});
