import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';

describe('Seed de E2E (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());
  const sembrar = () => http().post(ruta('/e2e/seed'));

  it('deja el admin, dos pacientes, un odontólogo y los servicios conocidos, sin citas', async () => {
    const res = await sembrar();

    expect(res.status).toBe(201);
    expect(await prisma.user.count({ where: { role: 'ADMIN' } })).toBe(1);
    expect(await prisma.patient.count()).toBe(2);
    expect(await prisma.dentist.count()).toBe(1);
    expect(await prisma.appointment.count()).toBe(0);
    expect(await prisma.service.count({ where: { activo: true } })).toBe(2);
    expect(await prisma.service.count({ where: { activo: false } })).toBe(1);
    const odontologo = await prisma.dentist.findFirstOrThrow({
      include: { services: true, availabilityRules: true },
    });
    expect(odontologo.services).toHaveLength(2);
    expect(odontologo.availabilityRules.map((r) => r.diaSemana).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(odontologo.availabilityRules[0]).toMatchObject({ minutoInicio: 540, minutoFin: 720 });
  });

  it('vuelve al mismo estado aunque se llame dos veces y existan citas', async () => {
    await sembrar();
    await http()
      .post(ruta('/e2e/citas'))
      .send({ paciente: 'paciente1', horaInicio: '2026-11-09T13:00:00.000Z' });

    const res = await sembrar();

    expect(res.status).toBe(201);
    expect(await prisma.appointment.count()).toBe(0);
    expect(await prisma.user.count()).toBe(4);
  });

  it.each([
    ['admin', 'admin@e2e.com', 'Admin12345', 'ADMIN'],
    ['paciente1', 'paciente1@e2e.com', 'Paciente12345', 'PACIENTE'],
    ['paciente2', 'paciente2@e2e.com', 'Paciente12345', 'PACIENTE'],
    ['odontologo', 'odontologo@e2e.com', 'Odontologo12345', 'ODONTOLOGO'],
  ])('el usuario %s puede iniciar sesión', async (_nombre, email, password, role) => {
    await sembrar();

    const res = await http().post(ruta('/auth/login')).send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
  });

  it('crea la cita pedida, con su hora de fin y con observación si se indica', async () => {
    await sembrar();

    const res = await http().post(ruta('/e2e/citas')).send({
      paciente: 'paciente2',
      horaInicio: '2026-11-02T13:00:00.000Z',
      estado: 'FINALIZADA',
      observacion: 'Sin novedades',
    });

    expect(res.status).toBe(201);
    const cita = await prisma.appointment.findUniqueOrThrow({
      where: { id: res.body.id },
      include: { observation: true, patient: { include: { user: true } } },
    });
    expect(cita).toMatchObject({
      estado: 'FINALIZADA',
      horaFin: new Date('2026-11-02T13:30:00.000Z'),
      observation: { texto: 'Sin novedades' },
      patient: { user: { email: 'paciente2@e2e.com' } },
    });
  });

  it('una cita creada es visible para su paciente por la API real', async () => {
    await sembrar();
    const { body } = await http()
      .post(ruta('/e2e/citas'))
      .send({ paciente: 'paciente1', horaInicio: '2026-11-10T13:00:00.000Z' });
    const token = await loginComo(app, { email: 'paciente1@e2e.com', password: 'Paciente12345' });

    const res = await conToken(http().get(ruta(`/appointments/${body.id}`)), token);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('PENDIENTE');
  });

  it.each([
    ['un paciente desconocido', { paciente: 'nadie', horaInicio: '2026-11-10T13:00:00.000Z' }],
    ['una fecha sin zona', { paciente: 'paciente1', horaInicio: '2026-11-10T13:00:00' }],
    [
      'un estado desconocido',
      { paciente: 'paciente1', horaInicio: '2026-11-10T13:00:00.000Z', estado: 'PERDIDA' },
    ],
  ])('responde 400 con %s', async (_caso, cuerpo) => {
    await sembrar();

    const res = await http().post(ruta('/e2e/citas')).send(cuerpo);

    expect(res.status).toBe(400);
  });

  describe('fuera de NODE_ENV=test', () => {
    const original = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = original;
    });

    it.each(['production', 'development'])(
      'con NODE_ENV=%s el seed no existe y no borra nada',
      async (entorno) => {
        await sembrar();
        process.env.NODE_ENV = entorno;

        const seed = await sembrar();
        const citas = await http()
          .post(ruta('/e2e/citas'))
          .send({ paciente: 'paciente1', horaInicio: '2026-11-10T13:00:00.000Z' });

        expect(seed.status).toBe(404);
        expect(citas.status).toBe(404);
        process.env.NODE_ENV = original;
        expect(await prisma.user.count()).toBe(4);
        expect(await prisma.appointment.count()).toBe(0);
      },
    );
  });
});
