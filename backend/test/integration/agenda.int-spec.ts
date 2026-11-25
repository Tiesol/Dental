import { INestApplication } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createAppointment, createDentist, createPatient } from '../helpers/factories';

describe('Agenda del odontólogo (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  // Lunes 9 de noviembre de 2026, 22:00 en La Paz: en UTC ya es martes.
  const now = new Date('2026-11-10T02:00:00.000Z');

  beforeAll(async () => {
    app = await createTestApp({ now });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());

  async function dentistWithToken() {
    const dentist = await createDentist(prisma);
    return { dentistId: dentist.dentist!.id, token: await loginAs(app, dentist) };
  }

  const appointment = (
    dentistId: string,
    startsAt: string,
    endsAt: string,
    status: AppointmentStatus = 'CONFIRMADA',
  ) =>
    createAppointment(prisma, {
      dentistId,
      horaInicio: new Date(startsAt),
      horaFin: new Date(endsAt),
      estado: status,
    });

  const ids = (body: unknown) => (body as { id: string }[]).map((c) => c.id);

  describe.each([
    ['GET /dentists/me/agenda', '/dentists/me/agenda'],
    ['GET /dentists/me/agenda/upcoming', '/dentists/me/agenda/upcoming'],
  ])('%s: control de acceso', (_name, path) => {
    it('responde 401 sin token', async () => {
      const res = await http().get(apiPath(path));

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', createPatient],
      ['ADMIN', createAdmin],
    ])('responde 403 con el rol %s', async (_role, create) => {
      const token = await loginAs(app, await create(prisma));

      const res = await withToken(http().get(apiPath(path)), token);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /dentists/me/agenda', () => {
    it('un odontólogo consulta únicamente su agenda', async () => {
      const { dentistId, token } = await dentistWithToken();
      const other = await dentistWithToken();
      const mine = await appointment(
        dentistId,
        '2026-11-10T01:00:00.000Z',
        '2026-11-10T01:30:00.000Z',
      );
      await appointment(other.dentistId, '2026-11-10T01:00:00.000Z', '2026-11-10T01:30:00.000Z');

      const res = await withToken(http().get(apiPath('/dentists/me/agenda')), token);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([mine.id]);
    });

    it('no acepta un parámetro para pedir la agenda de otro', async () => {
      const { token } = await dentistWithToken();
      const other = await dentistWithToken();

      const res = await withToken(
        http().get(apiPath('/dentists/me/agenda')).query({ dentistId: other.dentistId }),
        token,
      );

      expect(res.status).toBe(400);
    });

    it('"hoy" por defecto se calcula en la zona de la clínica y ordena por hora', async () => {
      const { dentistId, token } = await dentistWithToken();
      // Lunes 09:00 y 15:00 en La Paz son de hoy; martes 09:00 ya no.
      const afternoon = await appointment(
        dentistId,
        '2026-11-09T19:00:00.000Z',
        '2026-11-09T19:30:00.000Z',
      );
      const tomorrow = await appointment(
        dentistId,
        '2026-11-09T13:00:00.000Z',
        '2026-11-09T13:30:00.000Z',
      );
      await appointment(dentistId, '2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');

      const res = await withToken(http().get(apiPath('/dentists/me/agenda')), token);

      expect(ids(res.body)).toEqual([tomorrow.id, afternoon.id]);
    });

    it('con fecha devuelve las citas de ese día', async () => {
      const { dentistId, token } = await dentistWithToken();
      const tuesday = await appointment(
        dentistId,
        '2026-11-10T13:00:00.000Z',
        '2026-11-10T13:30:00.000Z',
      );
      await appointment(dentistId, '2026-11-09T13:00:00.000Z', '2026-11-09T13:30:00.000Z');

      const res = await withToken(
        http().get(apiPath('/dentists/me/agenda')).query({ fecha: '2026-11-10' }),
        token,
      );

      expect(ids(res.body)).toEqual([tuesday.id]);
    });

    it('no muestra las citas CANCELADA (D8), pero sí las FINALIZADA', async () => {
      const { dentistId, token } = await dentistWithToken();
      await appointment(
        dentistId,
        '2026-11-09T13:00:00.000Z',
        '2026-11-09T13:30:00.000Z',
        'CANCELADA',
      );
      const finished = await appointment(
        dentistId,
        '2026-11-09T14:00:00.000Z',
        '2026-11-09T14:30:00.000Z',
        'FINALIZADA',
      );

      const res = await withToken(http().get(apiPath('/dentists/me/agenda')), token);

      expect(ids(res.body)).toEqual([finished.id]);
    });

    it('cada cita incluye paciente, servicio, estado y observación', async () => {
      const { dentistId, token } = await dentistWithToken();
      const created = await appointment(
        dentistId,
        '2026-11-09T14:00:00.000Z',
        '2026-11-09T14:30:00.000Z',
        'FINALIZADA',
      );
      await prisma.observation.create({
        data: { appointmentId: created.id, texto: 'Sin novedades' },
      });

      const res = await withToken(http().get(apiPath('/dentists/me/agenda')), token);

      const [item] = res.body;
      expect(item).toMatchObject({
        estado: 'FINALIZADA',
        servicio: { id: created.serviceId },
        paciente: { id: created.patientId },
        observacion: { texto: 'Sin novedades' },
      });
    });

    it('responde 400 con una fecha que no existe', async () => {
      const { token } = await dentistWithToken();

      const res = await withToken(
        http().get(apiPath('/dentists/me/agenda')).query({ fecha: '2026-02-30' }),
        token,
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FECHA_INVALIDA');
    });
  });

  describe('GET /dentists/me/agenda/upcoming', () => {
    it('devuelve solo las citas propias que no han empezado, de la más cercana a la más lejana', async () => {
      const { dentistId, token } = await dentistWithToken();
      const other = await dentistWithToken();
      const lejana = await appointment(
        dentistId,
        '2026-11-12T13:00:00.000Z',
        '2026-11-12T13:30:00.000Z',
      );
      const cercana = await appointment(
        dentistId,
        '2026-11-10T13:00:00.000Z',
        '2026-11-10T13:30:00.000Z',
      );
      await appointment(dentistId, '2026-11-09T13:00:00.000Z', '2026-11-09T13:30:00.000Z');
      await appointment(other.dentistId, '2026-11-11T13:00:00.000Z', '2026-11-11T13:30:00.000Z');

      const res = await withToken(http().get(apiPath('/dentists/me/agenda/upcoming')), token);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([cercana.id, lejana.id]);
    });

    it.each(['CANCELADA', 'FINALIZADA'] as const)('no incluye las citas %s', async (status) => {
      const { dentistId, token } = await dentistWithToken();
      await appointment(dentistId, '2026-11-11T13:00:00.000Z', '2026-11-11T13:30:00.000Z', status);

      const res = await withToken(http().get(apiPath('/dentists/me/agenda/upcoming')), token);

      expect(res.body).toEqual([]);
    });

    it('respeta el limit', async () => {
      const { dentistId, token } = await dentistWithToken();
      const first = await appointment(
        dentistId,
        '2026-11-10T13:00:00.000Z',
        '2026-11-10T13:30:00.000Z',
      );
      await appointment(dentistId, '2026-11-11T13:00:00.000Z', '2026-11-11T13:30:00.000Z');

      const res = await withToken(
        http().get(apiPath('/dentists/me/agenda/upcoming')).query({ limit: 1 }),
        token,
      );

      expect(ids(res.body)).toEqual([first.id]);
    });

    it.each([
      ['cero', { limit: 0 }],
      ['mayor que 100', { limit: 101 }],
      ['que no es un número', { limit: 'muchas' }],
    ])('responde 400 con un limit %s', async (_testCase, query) => {
      const { token } = await dentistWithToken();

      const res = await withToken(
        http().get(apiPath('/dentists/me/agenda/upcoming')).query(query),
        token,
      );

      expect(res.status).toBe(400);
    });
  });
});
