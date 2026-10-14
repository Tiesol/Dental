import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare } from 'bcryptjs';
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
  });
});
