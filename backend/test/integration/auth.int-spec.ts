import { INestApplication } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import request from 'supertest';
import { createTestApp, createUser, truncateAll } from './helpers';

describe('Auth (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const registro = {
    email: 'Ana@Mail.com',
    password: 'secreta123',
    fullName: 'Ana Pérez',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => truncateAll(prisma));

  const http = () => request(app.getHttpServer());

  async function tokenDe(email: string, password: string) {
    const res = await http().post('/auth/login').send({ email, password });
    return res.body.accessToken as string;
  }

  describe('POST /auth/register', () => {
    it('responde 201 y el usuario existe en la BD con password hasheado', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ ...registro, role: 'ADMIN' })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'ana@mail.com',
        role: 'PATIENT',
      });
      expect(res.body).not.toHaveProperty('passwordHash');

      const enBd = await prisma.user.findUnique({
        where: { email: 'ana@mail.com' },
        include: { patient: true },
      });
      expect(enBd).not.toBeNull();
      expect(enBd!.patient).not.toBeNull();
      expect(enBd!.passwordHash).not.toBe(registro.password);
      expect(await compare(registro.password, enBd!.passwordHash)).toBe(true);
    });

    it('responde 409 si el email ya está registrado', async () => {
      await http().post('/auth/register').send(registro).expect(201);
      await http().post('/auth/register').send(registro).expect(409);
    });

    it('responde 400 si el body es inválido', async () => {
      await http()
        .post('/auth/register')
        .send({ email: 'no-es-email', password: '123', fullName: '' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(() => http().post('/auth/register').send(registro));

    it('responde 200 con accessToken si las credenciales son correctas', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: 'ana@mail.com', password: registro.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('responde 401 si la contraseña es incorrecta', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: 'ana@mail.com', password: 'incorrecta' })
        .expect(401);

      expect(res.body.message).toBe('Credenciales inválidas');
    });
  });

  describe('GET /auth/me', () => {
    it('responde 401 sin token', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('responde 200 con los datos del usuario del token', async () => {
      await http().post('/auth/register').send(registro);
      const token = await tokenDe('ana@mail.com', registro.password);

      const res = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'ana@mail.com',
        fullName: 'Ana Pérez',
        role: 'PATIENT',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /users', () => {
    it('responde 403 con token de PATIENT', async () => {
      await http().post('/auth/register').send(registro);
      const token = await tokenDe('ana@mail.com', registro.password);

      await http()
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('responde 200 con token de ADMIN', async () => {
      await createUser(prisma, {
        email: 'admin@clinica.com',
        password: 'Admin12345',
        role: Role.ADMIN,
      });
      const token = await tokenDe('admin@clinica.com', 'Admin12345');

      const res = await http()
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).not.toHaveProperty('passwordHash');
    });
  });
});
