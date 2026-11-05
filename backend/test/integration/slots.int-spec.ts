import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import {
  crearAdmin,
  crearCita,
  crearOdontologo,
  crearPaciente,
  crearServicio,
} from '../helpers/factories';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const MARTES = 2;
const MANIANA = '2026-11-10'; // Martes.

describe('Horarios disponibles (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  // Lunes 9 de noviembre de 2026, 10:00 en La Paz.
  const ahora = new Date('2026-11-09T14:00:00.000Z');

  beforeAll(async () => {
    app = await createTestApp({ ahora });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());

  // Odontólogo que realiza un servicio de 30 minutos y atiende los martes de 09:00 a 10:00.
  async function escenario() {
    const servicio = await crearServicio(prisma, { duracionMin: 30 });
    const odontologo = await crearOdontologo(prisma);
    const dentistId = odontologo.dentist!.id;
    await prisma.dentistService.create({ data: { dentistId, serviceId: servicio.id } });
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: MARTES, minutoInicio: 540, minutoFin: 600 },
    });
    const token = await loginComo(app, await crearPaciente(prisma));
    return { servicio, dentistId, odontologo, token };
  }

  const consultar = (dentistId: string, serviceId: string, fecha: string, token: string) =>
    conToken(
      http()
        .get(ruta(`/dentists/${dentistId}/slots`))
        .query({ serviceId, fecha }),
      token,
    );

  it('responde 401 sin token', async () => {
    const { dentistId, servicio } = await escenario();

    const res = await http()
      .get(ruta(`/dentists/${dentistId}/slots`))
      .query({ serviceId: servicio.id, fecha: MANIANA });

    expect(res.status).toBe(401);
  });

  it.each([
    ['ODONTOLOGO', crearOdontologo],
    ['ADMIN', crearAdmin],
  ])('permite consultarlos también al rol %s', async (_rol, crear) => {
    const { dentistId, servicio } = await escenario();
    const token = await loginComo(app, await crear(prisma));

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.status).toBe(200);
  });

  it('devuelve los horarios de un odontólogo real, en UTC y ordenados', async () => {
    const { dentistId, servicio, token } = await escenario();

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { inicio: '2026-11-10T13:00:00.000Z', fin: '2026-11-10T13:30:00.000Z' },
      { inicio: '2026-11-10T13:15:00.000Z', fin: '2026-11-10T13:45:00.000Z' },
      { inicio: '2026-11-10T13:30:00.000Z', fin: '2026-11-10T14:00:00.000Z' },
    ]);
  });

  it('una cita existente quita los horarios que se solapan con ella', async () => {
    const { dentistId, servicio, token } = await escenario();
    await crearCita(prisma, {
      dentistId,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
    });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.body).toEqual([
      { inicio: '2026-11-10T13:30:00.000Z', fin: '2026-11-10T14:00:00.000Z' },
    ]);
  });

  it('una cita CANCELADA no quita horarios', async () => {
    const { dentistId, servicio, token } = await escenario();
    await crearCita(prisma, {
      dentistId,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
      estado: 'CANCELADA',
    });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.body).toHaveLength(3);
  });

  it('la cita de otro odontólogo no quita horarios', async () => {
    const { dentistId, servicio, token } = await escenario();
    const otro = await crearOdontologo(prisma);
    await crearCita(prisma, {
      dentistId: otro.dentist!.id,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
    });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.body).toHaveLength(3);
  });

  it('un bloque no disponible quita los horarios que toca', async () => {
    const { dentistId, servicio, token } = await escenario();
    await prisma.unavailableBlock.create({
      data: {
        dentistId,
        inicio: new Date('2026-11-10T13:20:00.000Z'),
        fin: new Date('2026-11-10T13:25:00.000Z'),
      },
    });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.body).toEqual([
      { inicio: '2026-11-10T13:30:00.000Z', fin: '2026-11-10T14:00:00.000Z' },
    ]);
  });

  it('un día sin horario de atención devuelve una lista vacía', async () => {
    const { dentistId, servicio, token } = await escenario();

    const res = await consultar(dentistId, servicio.id, '2026-11-11', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('hoy solo ofrece los horarios que todavía no pasaron', async () => {
    const { dentistId, servicio, token } = await escenario();
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: 1, minutoInicio: 570, minutoFin: 660 },
    });

    const res = await consultar(dentistId, servicio.id, '2026-11-09', token);

    const inicios = (res.body as { inicio: string }[]).map((slot) => slot.inicio);
    expect(inicios).toEqual([
      '2026-11-09T14:00:00.000Z',
      '2026-11-09T14:15:00.000Z',
      '2026-11-09T14:30:00.000Z',
    ]);
  });

  it('una fecha pasada responde 200 con una lista vacía', async () => {
    const { dentistId, servicio, token } = await escenario();

    const res = await consultar(dentistId, servicio.id, '2026-11-03', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ['inexistente', '2026-02-30'],
    ['mal formada', '10/11/2026'],
  ])('una fecha %s responde 400 FECHA_INVALIDA', async (_caso, fecha) => {
    const { dentistId, servicio, token } = await escenario();

    const res = await consultar(dentistId, servicio.id, fecha, token);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('FECHA_INVALIDA');
  });

  it.each([
    ['sin serviceId', { fecha: MANIANA }],
    ['sin fecha', { serviceId: ID_INEXISTENTE }],
    ['con un serviceId mal formado', { serviceId: 'x', fecha: MANIANA }],
  ])('responde 400 %s', async (_caso, query) => {
    const { dentistId, token } = await escenario();

    const res = await conToken(
      http()
        .get(ruta(`/dentists/${dentistId}/slots`))
        .query(query),
      token,
    );

    expect(res.status).toBe(400);
  });

  it('responde 400 con un id de odontólogo mal formado', async () => {
    const { servicio, token } = await escenario();

    const res = await consultar('no-es-uuid', servicio.id, MANIANA, token);

    expect(res.status).toBe(400);
  });

  it('responde 404 si el odontólogo no existe', async () => {
    const { servicio, token } = await escenario();

    const res = await consultar(ID_INEXISTENTE, servicio.id, MANIANA, token);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RECURSO_NO_ENCONTRADO');
  });

  it('responde 404 si el servicio no existe', async () => {
    const { dentistId, token } = await escenario();

    const res = await consultar(dentistId, ID_INEXISTENTE, MANIANA, token);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RECURSO_NO_ENCONTRADO');
  });

  it('responde 409 si el servicio está deshabilitado', async () => {
    const { dentistId, servicio, token } = await escenario();
    await prisma.service.update({ where: { id: servicio.id }, data: { activo: false } });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SERVICIO_DESHABILITADO');
  });

  it('responde 409 si el odontólogo no acepta citas', async () => {
    const { dentistId, servicio, token } = await escenario();
    await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
  });

  it('responde 409 si la cuenta del odontólogo está deshabilitada', async () => {
    const { odontologo, dentistId, servicio, token } = await escenario();
    await prisma.user.update({ where: { id: odontologo.id }, data: { activo: false } });

    const res = await consultar(dentistId, servicio.id, MANIANA, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
  });

  it('responde 409 si el odontólogo no realiza el servicio', async () => {
    const { dentistId, token } = await escenario();
    const otroServicio = await crearServicio(prisma);

    const res = await consultar(dentistId, otroServicio.id, MANIANA, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ODONTOLOGO_NO_REALIZA_SERVICIO');
  });
});
