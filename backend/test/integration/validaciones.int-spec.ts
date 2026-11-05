import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearOdontologo, crearPaciente, crearServicio } from '../helpers/factories';

const SOLO_ESPACIOS = '   ';
const MUY_LARGO = 'x'.repeat(101);
const FECHAS_FUERA_DE_RANGO = [
  ['posterior al año 2999', '3000-01-06T13:00:00.000Z'],
  ['del último día representable', '9999-12-31T23:59:59-23:59'],
  ['anterior al año 1000', '0999-01-06T13:00:00.000Z'],
];

describe('Validación de textos y fechas (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    app = await createTestApp({ ahora: new Date('2026-11-09T14:00:00.000Z') });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());
  const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));

  describe('POST /auth/register', () => {
    const datos = {
      email: 'ana@mail.com',
      password: 'secreta123',
      nombre: 'Ana',
      apellido: 'Pérez',
    };

    it.each([
      ['nombre solo con espacios', { nombre: SOLO_ESPACIOS }],
      ['apellido solo con espacios', { apellido: SOLO_ESPACIOS }],
      ['nombre de más de 100 caracteres', { nombre: MUY_LARGO }],
      ['apellido de más de 100 caracteres', { apellido: MUY_LARGO }],
      ['teléfono de más de 30 caracteres', { telefono: '1'.repeat(31) }],
    ])('responde 400 con %s y no crea la cuenta', async (_caso, cambios) => {
      const res = await http()
        .post(ruta('/auth/register'))
        .send({ ...datos, ...cambios });

      expect(res.status).toBe(400);
      expect(await prisma.user.count()).toBe(0);
    });

    it('acepta un nombre de 100 caracteres', async () => {
      const res = await http()
        .post(ruta('/auth/register'))
        .send({ ...datos, nombre: 'x'.repeat(100) });

      expect(res.status).toBe(201);
    });
  });

  describe('POST /services', () => {
    it.each([
      ['nombre', { nombre: SOLO_ESPACIOS }],
      ['descripcion', { descripcion: SOLO_ESPACIOS }],
    ])('responde 400 con %s solo con espacios', async (_campo, cambios) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/services')), token).send({
        nombre: 'Limpieza',
        descripcion: 'Profilaxis',
        duracionMin: 30,
        ...cambios,
      });

      expect(res.status).toBe(400);
      expect(await prisma.service.count()).toBe(0);
    });
  });

  describe('PATCH /services/:id', () => {
    it('responde 400 con un nombre solo con espacios y lo conserva', async () => {
      const servicio = await crearServicio(prisma, { nombre: 'Limpieza' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/services/${servicio.id}`)), token).send({
        nombre: SOLO_ESPACIOS,
      });

      expect(res.status).toBe(400);
      const enBd = await prisma.service.findUniqueOrThrow({ where: { id: servicio.id } });
      expect(enBd.nombre).toBe('Limpieza');
    });
  });

  describe('odontólogos', () => {
    it.each([
      ['nombre', { nombre: SOLO_ESPACIOS }],
      ['especialidad', { especialidad: SOLO_ESPACIOS }],
    ])('POST /dentists responde 400 con %s solo con espacios', async (_campo, cambios) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/dentists')), token).send({
        email: 'carlos@clinica.com',
        password: 'secreta123',
        nombre: 'Dr. Carlos',
        especialidad: 'Ortodoncia',
        serviceIds: [],
        ...cambios,
      });

      expect(res.status).toBe(400);
      expect(await prisma.dentist.count()).toBe(0);
    });

    it('PATCH /dentists/:id responde 400 con un nombre solo con espacios', async () => {
      const odontologo = await crearOdontologo(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().patch(ruta(`/dentists/${odontologo.dentist!.id}`)),
        token,
      ).send({ nombre: SOLO_ESPACIOS });

      expect(res.status).toBe(400);
    });
  });

  describe('usuarios', () => {
    it('POST /users responde 400 con un odontólogo de nombre solo con espacios', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/users')), token).send({
        email: 'nueva@clinica.com',
        password: 'secreta123',
        role: 'ODONTOLOGO',
        nombre: SOLO_ESPACIOS,
        especialidad: 'General',
      });

      expect(res.status).toBe(400);
    });

    it.each([
      ['un nombre solo con espacios', { nombre: SOLO_ESPACIOS }],
      ['un apellido de más de 100 caracteres', { apellido: MUY_LARGO }],
    ])('PATCH /users/me responde 400 con %s', async (_caso, cuerpo) => {
      const token = await loginComo(app, await crearPaciente(prisma));

      const res = await conToken(http().patch(ruta('/users/me')), token).send(cuerpo);

      expect(res.status).toBe(400);
    });

    it.each([
      ['un nombre solo con espacios', { nombre: SOLO_ESPACIOS }],
      ['un nombre de más de 100 caracteres', { nombre: MUY_LARGO }],
    ])('PATCH /users/:id responde 400 con %s', async (_caso, cuerpo) => {
      const paciente = await crearPaciente(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/users/${paciente.id}`)), token).send(cuerpo);

      expect(res.status).toBe(400);
    });
  });

  describe('fechas de años extremos', () => {
    it.each(FECHAS_FUERA_DE_RANGO)(
      'POST /appointments responde 400 con una fecha %s',
      async (_caso, horaInicio) => {
        const odontologo = await crearOdontologo(prisma);
        const servicio = await crearServicio(prisma);
        const token = await loginComo(app, await crearPaciente(prisma));

        const res = await conToken(http().post(ruta('/appointments')), token).send({
          dentistId: odontologo.dentist!.id,
          serviceId: servicio.id,
          horaInicio,
        });

        expect(res.status).toBe(400);
        expect(await prisma.appointment.count()).toBe(0);
      },
    );

    it.each(FECHAS_FUERA_DE_RANGO)(
      'POST /dentists/:id/blocks responde 400 con un fin %s',
      async (_caso, fin) => {
        const odontologo = await crearOdontologo(prisma);
        const token = await tokenDeAdmin();

        const res = await conToken(
          http().post(ruta(`/dentists/${odontologo.dentist!.id}/blocks`)),
          token,
        ).send({ inicio: '2026-11-10T14:00:00.000Z', fin });

        expect(res.status).toBe(400);
        expect(await prisma.unavailableBlock.count()).toBe(0);
      },
    );
  });
});
