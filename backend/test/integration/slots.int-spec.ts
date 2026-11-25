import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import {
  createAdmin,
  createAppointment,
  createDentist,
  createPatient,
  createService,
} from '../helpers/factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';
const TUESDAY = 2;
const TOMORROW = '2026-11-10'; // Martes.

describe('Horarios disponibles (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  // Lunes 9 de noviembre de 2026, 10:00 en La Paz.
  const now = new Date('2026-11-09T14:00:00.000Z');

  beforeAll(async () => {
    app = await createTestApp({ now });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());

  // Odontólogo que realiza un servicio de 30 minutos y atiende los martes de 09:00 a 10:00.
  async function scenario() {
    const service = await createService(prisma, { duracionMin: 30 });
    const dentist = await createDentist(prisma);
    const dentistId = dentist.dentist!.id;
    await prisma.dentistService.create({ data: { dentistId, serviceId: service.id } });
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: TUESDAY, minutoInicio: 540, minutoFin: 600 },
    });
    const token = await loginAs(app, await createPatient(prisma));
    return { service, dentistId, dentist, token };
  }

  const fetchSlots = (dentistId: string, serviceId: string, date: string, token: string) =>
    withToken(
      http()
        .get(apiPath(`/dentists/${dentistId}/slots`))
        .query({ serviceId, fecha: date }),
      token,
    );

  it('responde 401 sin token', async () => {
    const { dentistId, service } = await scenario();

    const res = await http()
      .get(apiPath(`/dentists/${dentistId}/slots`))
      .query({ serviceId: service.id, fecha: TOMORROW });

    expect(res.status).toBe(401);
  });

  it.each([
    ['ODONTOLOGO', createDentist],
    ['ADMIN', createAdmin],
  ])('permite consultarlos también al rol %s', async (_role, create) => {
    const { dentistId, service } = await scenario();
    const token = await loginAs(app, await create(prisma));

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.status).toBe(200);
  });

  it('devuelve los horarios de un odontólogo real, en UTC y ordenados', async () => {
    const { dentistId, service, token } = await scenario();

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { inicio: '2026-11-10T13:00:00.000Z', fin: '2026-11-10T13:30:00.000Z' },
      { inicio: '2026-11-10T13:15:00.000Z', fin: '2026-11-10T13:45:00.000Z' },
      { inicio: '2026-11-10T13:30:00.000Z', fin: '2026-11-10T14:00:00.000Z' },
    ]);
  });

  it('una cita existente quita los horarios que se solapan con ella', async () => {
    const { dentistId, service, token } = await scenario();
    await createAppointment(prisma, {
      dentistId,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
    });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.body).toEqual([
      { inicio: '2026-11-10T13:30:00.000Z', fin: '2026-11-10T14:00:00.000Z' },
    ]);
  });

  it('una cita CANCELADA no quita horarios', async () => {
    const { dentistId, service, token } = await scenario();
    await createAppointment(prisma, {
      dentistId,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
      estado: 'CANCELADA',
    });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.body).toHaveLength(3);
  });

  it('la cita de otro odontólogo no quita horarios', async () => {
    const { dentistId, service, token } = await scenario();
    const other = await createDentist(prisma);
    await createAppointment(prisma, {
      dentistId: other.dentist!.id,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
    });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.body).toHaveLength(3);
  });

  it('un bloque no disponible quita los horarios que toca', async () => {
    const { dentistId, service, token } = await scenario();
    await prisma.unavailableBlock.create({
      data: {
        dentistId,
        inicio: new Date('2026-11-10T13:20:00.000Z'),
        fin: new Date('2026-11-10T13:25:00.000Z'),
      },
    });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.body).toEqual([
      { inicio: '2026-11-10T13:30:00.000Z', fin: '2026-11-10T14:00:00.000Z' },
    ]);
  });

  it('un día sin horario de atención devuelve una lista vacía', async () => {
    const { dentistId, service, token } = await scenario();

    const res = await fetchSlots(dentistId, service.id, '2026-11-11', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('hoy solo ofrece los horarios que todavía no pasaron', async () => {
    const { dentistId, service, token } = await scenario();
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: 1, minutoInicio: 570, minutoFin: 660 },
    });

    const res = await fetchSlots(dentistId, service.id, '2026-11-09', token);

    const starts = (res.body as { inicio: string }[]).map((slot) => slot.inicio);
    expect(starts).toEqual([
      '2026-11-09T14:00:00.000Z',
      '2026-11-09T14:15:00.000Z',
      '2026-11-09T14:30:00.000Z',
    ]);
  });

  it('una fecha pasada responde 200 con una lista vacía', async () => {
    const { dentistId, service, token } = await scenario();

    const res = await fetchSlots(dentistId, service.id, '2026-11-03', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ['inexistente', '2026-02-30'],
    ['mal formada', '10/11/2026'],
  ])('una fecha %s responde 400 FECHA_INVALIDA', async (_testCase, date) => {
    const { dentistId, service, token } = await scenario();

    const res = await fetchSlots(dentistId, service.id, date, token);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('FECHA_INVALIDA');
  });

  it.each([
    ['sin serviceId', { fecha: TOMORROW }],
    ['sin fecha', { serviceId: MISSING_ID }],
    ['con un serviceId mal formado', { serviceId: 'x', fecha: TOMORROW }],
  ])('responde 400 %s', async (_testCase, query) => {
    const { dentistId, token } = await scenario();

    const res = await withToken(
      http()
        .get(apiPath(`/dentists/${dentistId}/slots`))
        .query(query),
      token,
    );

    expect(res.status).toBe(400);
  });

  it('responde 400 con un id de odontólogo mal formado', async () => {
    const { service, token } = await scenario();

    const res = await fetchSlots('no-es-uuid', service.id, TOMORROW, token);

    expect(res.status).toBe(400);
  });

  it('responde 404 si el odontólogo no existe', async () => {
    const { service, token } = await scenario();

    const res = await fetchSlots(MISSING_ID, service.id, TOMORROW, token);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RECURSO_NO_ENCONTRADO');
  });

  it('responde 404 si el servicio no existe', async () => {
    const { dentistId, token } = await scenario();

    const res = await fetchSlots(dentistId, MISSING_ID, TOMORROW, token);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RECURSO_NO_ENCONTRADO');
  });

  it('responde 409 si el servicio está deshabilitado', async () => {
    const { dentistId, service, token } = await scenario();
    await prisma.service.update({ where: { id: service.id }, data: { activo: false } });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SERVICIO_DESHABILITADO');
  });

  it('responde 409 si el odontólogo no acepta citas', async () => {
    const { dentistId, service, token } = await scenario();
    await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
  });

  it('responde 409 si la cuenta del odontólogo está deshabilitada', async () => {
    const { dentist, dentistId, service, token } = await scenario();
    await prisma.user.update({ where: { id: dentist.id }, data: { activo: false } });

    const res = await fetchSlots(dentistId, service.id, TOMORROW, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
  });

  it('responde 409 si el odontólogo no realiza el servicio', async () => {
    const { dentistId, token } = await scenario();
    const otherService = await createService(prisma);

    const res = await fetchSlots(dentistId, otherService.id, TOMORROW, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ODONTOLOGO_NO_REALIZA_SERVICIO');
  });
});
