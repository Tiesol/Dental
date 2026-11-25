import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createDentist, createPatient, createService } from '../helpers/factories';

const ONLY_SPACES = '   ';
const TOO_LONG = 'x'.repeat(101);
const OUT_OF_RANGE_DATES = [
  ['posterior al año 2999', '3000-01-06T13:00:00.000Z'],
  ['del último día representable', '9999-12-31T23:59:59-23:59'],
  ['anterior al año 1000', '0999-01-06T13:00:00.000Z'],
];

describe('Validación de textos y fechas (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    app = await createTestApp({ now: new Date('2026-11-09T14:00:00.000Z') });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());
  const adminToken = async () => loginAs(app, await createAdmin(prisma));

  describe('POST /auth/register', () => {
    const data = {
      email: 'ana@mail.com',
      password: 'secreta123',
      nombre: 'Ana',
      apellido: 'Pérez',
    };

    it.each([
      ['nombre solo con espacios', { nombre: ONLY_SPACES }],
      ['apellido solo con espacios', { apellido: ONLY_SPACES }],
      ['nombre de más de 100 caracteres', { nombre: TOO_LONG }],
      ['apellido de más de 100 caracteres', { apellido: TOO_LONG }],
      ['teléfono de más de 30 caracteres', { telefono: '1'.repeat(31) }],
    ])('responde 400 con %s y no crea la cuenta', async (_testCase, changes) => {
      const res = await http()
        .post(apiPath('/auth/register'))
        .send({ ...data, ...changes });

      expect(res.status).toBe(400);
      expect(await prisma.user.count()).toBe(0);
    });

    it('acepta un nombre de 100 caracteres', async () => {
      const res = await http()
        .post(apiPath('/auth/register'))
        .send({ ...data, nombre: 'x'.repeat(100) });

      expect(res.status).toBe(201);
    });
  });

  describe('POST /services', () => {
    it.each([
      ['nombre', { nombre: ONLY_SPACES }],
      ['descripcion', { descripcion: ONLY_SPACES }],
    ])('responde 400 con %s solo con espacios', async (_field, changes) => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/services')), token).send({
        nombre: 'Limpieza',
        descripcion: 'Profilaxis',
        duracionMin: 30,
        ...changes,
      });

      expect(res.status).toBe(400);
      expect(await prisma.service.count()).toBe(0);
    });
  });

  describe('PATCH /services/:id', () => {
    it('responde 400 con un nombre solo con espacios y lo conserva', async () => {
      const service = await createService(prisma, { nombre: 'Limpieza' });
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/services/${service.id}`)), token).send({
        nombre: ONLY_SPACES,
      });

      expect(res.status).toBe(400);
      const inDb = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
      expect(inDb.nombre).toBe('Limpieza');
    });
  });

  describe('odontólogos', () => {
    it.each([
      ['nombre', { nombre: ONLY_SPACES }],
      ['especialidad', { especialidad: ONLY_SPACES }],
    ])('POST /dentists responde 400 con %s solo con espacios', async (_field, changes) => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/dentists')), token).send({
        email: 'carlos@clinica.com',
        password: 'secreta123',
        nombre: 'Dr. Carlos',
        especialidad: 'Ortodoncia',
        serviceIds: [],
        ...changes,
      });

      expect(res.status).toBe(400);
      expect(await prisma.dentist.count()).toBe(0);
    });

    it('PATCH /dentists/:id responde 400 con un nombre solo con espacios', async () => {
      const dentist = await createDentist(prisma);
      const token = await adminToken();

      const res = await withToken(
        http().patch(apiPath(`/dentists/${dentist.dentist!.id}`)),
        token,
      ).send({ nombre: ONLY_SPACES });

      expect(res.status).toBe(400);
    });
  });

  describe('usuarios', () => {
    it('POST /users responde 400 con un odontólogo de nombre solo con espacios', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/users')), token).send({
        email: 'nueva@clinica.com',
        password: 'secreta123',
        role: 'ODONTOLOGO',
        nombre: ONLY_SPACES,
        especialidad: 'General',
      });

      expect(res.status).toBe(400);
    });

    it.each([
      ['un nombre solo con espacios', { nombre: ONLY_SPACES }],
      ['un apellido de más de 100 caracteres', { apellido: TOO_LONG }],
    ])('PATCH /users/me responde 400 con %s', async (_testCase, body) => {
      const token = await loginAs(app, await createPatient(prisma));

      const res = await withToken(http().patch(apiPath('/users/me')), token).send(body);

      expect(res.status).toBe(400);
    });

    it.each([
      ['un nombre solo con espacios', { nombre: ONLY_SPACES }],
      ['un nombre de más de 100 caracteres', { nombre: TOO_LONG }],
    ])('PATCH /users/:id responde 400 con %s', async (_testCase, body) => {
      const patient = await createPatient(prisma);
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/users/${patient.id}`)), token).send(body);

      expect(res.status).toBe(400);
    });
  });

  describe('fechas de años extremos', () => {
    it.each(OUT_OF_RANGE_DATES)(
      'POST /appointments responde 400 con una fecha %s',
      async (_testCase, startsAt) => {
        const dentist = await createDentist(prisma);
        const service = await createService(prisma);
        const token = await loginAs(app, await createPatient(prisma));

        const res = await withToken(http().post(apiPath('/appointments')), token).send({
          dentistId: dentist.dentist!.id,
          serviceId: service.id,
          horaInicio: startsAt,
        });

        expect(res.status).toBe(400);
        expect(await prisma.appointment.count()).toBe(0);
      },
    );

    it.each(OUT_OF_RANGE_DATES)(
      'POST /dentists/:id/blocks responde 400 con un fin %s',
      async (_testCase, end) => {
        const dentist = await createDentist(prisma);
        const token = await adminToken();

        const res = await withToken(
          http().post(apiPath(`/dentists/${dentist.dentist!.id}/blocks`)),
          token,
        ).send({ inicio: '2026-11-10T14:00:00.000Z', fin: end });

        expect(res.status).toBe(400);
        expect(await prisma.unavailableBlock.count()).toBe(0);
      },
    );
  });
});
