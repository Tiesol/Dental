import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createPatient } from '../helpers/factories';

describe('Auth (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const registration = {
    email: 'Ana@Mail.com',
    password: 'secreta123',
    nombre: 'Ana',
    apellido: 'Pérez',
    telefono: '70000000',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());

  describe('POST /auth/register', () => {
    it('responde 201 y persiste usuario PACIENTE con perfil Patient y password hasheado', async () => {
      // Act
      const res = await http().post(apiPath('/auth/register')).send(registration).expect(201);

      // Assert (respuesta)
      expect(res.body).toMatchObject({
        email: 'ana@mail.com',
        role: 'PACIENTE',
        nombre: 'Ana Pérez',
      });
      expect(res.body).not.toHaveProperty('passwordHash');

      // Assert (persistencia)
      const inDb = await prisma.user.findUnique({
        where: { email: 'ana@mail.com' },
        include: { patient: true },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.role).toBe('PACIENTE');
      expect(inDb!.patient).toMatchObject({
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: '70000000',
      });
      expect(inDb!.passwordHash).not.toBe(registration.password);
      expect(await compare(registration.password, inDb!.passwordHash)).toBe(true);
    });

    it('responde 409 con formato de error uniforme si el email ya está registrado', async () => {
      await http().post(apiPath('/auth/register')).send(registration).expect(201);

      const res = await http().post(apiPath('/auth/register')).send(registration).expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        error: 'EMAIL_YA_REGISTRADO',
        message: 'El email ya está registrado',
      });
    });

    it('responde 400 si el body es inválido', async () => {
      await http()
        .post(apiPath('/auth/register'))
        .send({ email: 'no-es-email', password: '123', nombre: '', apellido: '' })
        .expect(400);
    });

    it('responde 400 si el cliente intenta enviar un rol (campo no permitido)', async () => {
      await http()
        .post(apiPath('/auth/register'))
        .send({ ...registration, role: 'ADMIN' })
        .expect(400);

      expect(await prisma.user.count()).toBe(0);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(() => http().post(apiPath('/auth/register')).send(registration));

    it('responde 200 con accessToken y usuario público si las credenciales son correctas', async () => {
      const res = await http()
        .post(apiPath('/auth/login'))
        .send({ email: 'ana@mail.com', password: registration.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'ana@mail.com', role: 'PACIENTE' });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('responde 401 si la contraseña es incorrecta', async () => {
      const res = await http()
        .post(apiPath('/auth/login'))
        .send({ email: 'ana@mail.com', password: 'incorrecta' })
        .expect(401);

      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('responde 401 si el usuario está inactivo', async () => {
      await prisma.user.update({ where: { email: 'ana@mail.com' }, data: { activo: false } });

      await http()
        .post(apiPath('/auth/login'))
        .send({ email: 'ana@mail.com', password: registration.password })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('responde 401 sin token', async () => {
      await http().get(apiPath('/auth/me')).expect(401);
    });

    it('responde 401 con token inválido', async () => {
      await withToken(http().get(apiPath('/auth/me')), 'token-falso').expect(401);
    });

    it('responde 200 con los datos del usuario del token', async () => {
      const patient = await createPatient(prisma, { nombre: 'Ana', apellido: 'Pérez' });
      const token = await loginAs(app, patient);

      const res = await withToken(http().get(apiPath('/auth/me')), token).expect(200);

      expect(res.body).toMatchObject({
        email: patient.email,
        nombre: 'Ana Pérez',
        role: 'PACIENTE',
        patientId: patient.patient!.id,
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /users', () => {
    it('responde 401 sin token', async () => {
      await http().get(apiPath('/users')).expect(401);
    });

    it('responde 403 con token de PACIENTE', async () => {
      const patient = await createPatient(prisma);
      const token = await loginAs(app, patient);

      await withToken(http().get(apiPath('/users')), token).expect(403);
    });

    it('responde 200 con la lista de usuarios públicos con token de ADMIN', async () => {
      await createPatient(prisma);
      const admin = await createAdmin(prisma);
      const token = await loginAs(app, admin);

      const res = await withToken(http().get(apiPath('/users')), token).expect(200);

      expect(res.body).toHaveLength(2);
      for (const u of res.body as object[]) {
        expect(u).not.toHaveProperty('passwordHash');
      }
    });
  });
});
