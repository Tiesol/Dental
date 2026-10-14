import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearPaciente } from '../helpers/factories';

describe('Auth (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const registro = {
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
      const res = await http().post(ruta('/auth/register')).send(registro).expect(201);

      // Assert (respuesta)
      expect(res.body).toMatchObject({
        email: 'ana@mail.com',
        role: 'PACIENTE',
        nombre: 'Ana Pérez',
      });
      expect(res.body).not.toHaveProperty('passwordHash');

      // Assert (persistencia)
      const enBd = await prisma.user.findUnique({
        where: { email: 'ana@mail.com' },
        include: { patient: true },
      });
      expect(enBd).not.toBeNull();
      expect(enBd!.role).toBe('PACIENTE');
      expect(enBd!.patient).toMatchObject({
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: '70000000',
      });
      expect(enBd!.passwordHash).not.toBe(registro.password);
      expect(await compare(registro.password, enBd!.passwordHash)).toBe(true);
    });

    it('responde 409 con formato de error uniforme si el email ya está registrado', async () => {
      await http().post(ruta('/auth/register')).send(registro).expect(201);

      const res = await http().post(ruta('/auth/register')).send(registro).expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        error: 'EMAIL_YA_REGISTRADO',
        message: 'El email ya está registrado',
      });
    });

    it('responde 400 si el body es inválido', async () => {
      await http()
        .post(ruta('/auth/register'))
        .send({ email: 'no-es-email', password: '123', nombre: '', apellido: '' })
        .expect(400);
    });

    it('responde 400 si el cliente intenta enviar un rol (campo no permitido)', async () => {
      await http()
        .post(ruta('/auth/register'))
        .send({ ...registro, role: 'ADMIN' })
        .expect(400);

      expect(await prisma.user.count()).toBe(0);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(() => http().post(ruta('/auth/register')).send(registro));

    it('responde 200 con accessToken y usuario público si las credenciales son correctas', async () => {
      const res = await http()
        .post(ruta('/auth/login'))
        .send({ email: 'ana@mail.com', password: registro.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'ana@mail.com', role: 'PACIENTE' });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('responde 401 si la contraseña es incorrecta', async () => {
      const res = await http()
        .post(ruta('/auth/login'))
        .send({ email: 'ana@mail.com', password: 'incorrecta' })
        .expect(401);

      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('responde 401 si el usuario está inactivo', async () => {
      await prisma.user.update({ where: { email: 'ana@mail.com' }, data: { activo: false } });

      await http()
        .post(ruta('/auth/login'))
        .send({ email: 'ana@mail.com', password: registro.password })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('responde 401 sin token', async () => {
      await http().get(ruta('/auth/me')).expect(401);
    });

    it('responde 401 con token inválido', async () => {
      await conToken(http().get(ruta('/auth/me')), 'token-falso').expect(401);
    });

    it('responde 200 con los datos del usuario del token', async () => {
      const paciente = await crearPaciente(prisma, { nombre: 'Ana', apellido: 'Pérez' });
      const token = await loginComo(app, paciente);

      const res = await conToken(http().get(ruta('/auth/me')), token).expect(200);

      expect(res.body).toMatchObject({
        email: paciente.email,
        nombre: 'Ana Pérez',
        role: 'PACIENTE',
        patientId: paciente.patient!.id,
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /users', () => {
    it('responde 401 sin token', async () => {
      await http().get(ruta('/users')).expect(401);
    });

    it('responde 403 con token de PACIENTE', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await loginComo(app, paciente);

      await conToken(http().get(ruta('/users')), token).expect(403);
    });

    it('responde 200 con la lista de usuarios públicos con token de ADMIN', async () => {
      await crearPaciente(prisma);
      const admin = await crearAdmin(prisma);
      const token = await loginComo(app, admin);

      const res = await conToken(http().get(ruta('/users')), token).expect(200);

      expect(res.body).toHaveLength(2);
      for (const u of res.body as object[]) {
        expect(u).not.toHaveProperty('passwordHash');
      }
    });
  });
});
