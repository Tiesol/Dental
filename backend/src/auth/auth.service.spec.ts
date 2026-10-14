import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  const jwt = { signAsync: jest.fn() };

  const registro = {
    email: 'ana@mail.com',
    password: 'secreta123',
    fullName: 'Ana Pérez',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'u1',
        isActive: true,
        createdAt: new Date(),
        ...data,
      }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  const datosCreados = () => prisma.user.create.mock.calls[0][0].data;

  describe('register', () => {
    it('crea el usuario con la contraseña hasheada', async () => {
      await service.register(registro);

      const data = datosCreados();
      expect(data.passwordHash).not.toBe(registro.password);
      expect(await compare(registro.password, data.passwordHash)).toBe(true);
    });

    it('normaliza el email a minúsculas', async () => {
      await service.register({ ...registro, email: '  Ana@MAIL.com ' });

      expect(datosCreados().email).toBe('ana@mail.com');
    });

    it('siempre asigna rol PATIENT y crea el registro Patient', async () => {
      await service.register({ ...registro, role: 'ADMIN' } as any);

      const data = datosCreados();
      expect(data.role).toBe('PATIENT');
      expect(data.patient).toEqual({ create: {} });
    });

    it('lanza ConflictException si el email ya existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'otro' });

      await expect(service.register(registro)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('el resultado no contiene passwordHash', async () => {
      const user = await service.register(registro);

      expect(user).not.toHaveProperty('passwordHash');
      expect(user).toMatchObject({ email: 'ana@mail.com', role: 'PATIENT' });
    });
  });

  describe('login', () => {
    let usuarioGuardado: Record<string, unknown>;

    beforeEach(async () => {
      usuarioGuardado = {
        id: 'u1',
        email: 'ana@mail.com',
        fullName: 'Ana Pérez',
        role: 'PATIENT',
        isActive: true,
        passwordHash: await hash('secreta123', 4),
      };
      prisma.user.findUnique.mockResolvedValue(usuarioGuardado);
      jwt.signAsync.mockResolvedValue('token-firmado');
    });

    it('devuelve accessToken con payload { sub, email, role } si las credenciales son correctas', async () => {
      const result = await service.login({
        email: 'ANA@mail.com',
        password: 'secreta123',
      });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'ana@mail.com',
        role: 'PATIENT',
      });
      expect(result.accessToken).toBe('token-firmado');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('lanza UnauthorizedException si el email no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nadie@mail.com', password: 'secreta123' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      await expect(
        service.login({ email: 'ana@mail.com', password: 'incorrecta' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });
});
