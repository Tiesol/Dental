import { INestApplication } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearCita, crearOdontologo, crearPaciente } from '../helpers/factories';

describe('Agenda del odontólogo (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  // Lunes 9 de noviembre de 2026, 22:00 en La Paz: en UTC ya es martes.
  const ahora = new Date('2026-11-10T02:00:00.000Z');

  beforeAll(async () => {
    app = await createTestApp({ ahora });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());

  async function odontologoConToken() {
    const odontologo = await crearOdontologo(prisma);
    return { dentistId: odontologo.dentist!.id, token: await loginComo(app, odontologo) };
  }

  const cita = (
    dentistId: string,
    horaInicio: string,
    horaFin: string,
    estado: AppointmentStatus = 'CONFIRMADA',
  ) =>
    crearCita(prisma, {
      dentistId,
      horaInicio: new Date(horaInicio),
      horaFin: new Date(horaFin),
      estado,
    });

  const ids = (body: unknown) => (body as { id: string }[]).map((c) => c.id);

  describe.each([
    ['GET /dentists/me/agenda', '/dentists/me/agenda'],
    ['GET /dentists/me/agenda/upcoming', '/dentists/me/agenda/upcoming'],
  ])('%s: control de acceso', (_nombre, path) => {
    it('responde 401 sin token', async () => {
      const res = await http().get(ruta(path));

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', crearPaciente],
      ['ADMIN', crearAdmin],
    ])('responde 403 con el rol %s', async (_rol, crear) => {
      const token = await loginComo(app, await crear(prisma));

      const res = await conToken(http().get(ruta(path)), token);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /dentists/me/agenda', () => {
    it('un odontólogo consulta únicamente su agenda', async () => {
      const { dentistId, token } = await odontologoConToken();
      const otro = await odontologoConToken();
      const mia = await cita(dentistId, '2026-11-10T01:00:00.000Z', '2026-11-10T01:30:00.000Z');
      await cita(otro.dentistId, '2026-11-10T01:00:00.000Z', '2026-11-10T01:30:00.000Z');

      const res = await conToken(http().get(ruta('/dentists/me/agenda')), token);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([mia.id]);
    });

    it('no acepta un parámetro para pedir la agenda de otro', async () => {
      const { token } = await odontologoConToken();
      const otro = await odontologoConToken();

      const res = await conToken(
        http().get(ruta('/dentists/me/agenda')).query({ dentistId: otro.dentistId }),
        token,
      );

      expect(res.status).toBe(400);
    });

    it('"hoy" por defecto se calcula en la zona de la clínica y ordena por hora', async () => {
      const { dentistId, token } = await odontologoConToken();
      // Lunes 09:00 y 15:00 en La Paz son de hoy; martes 09:00 ya no.
      const tarde = await cita(dentistId, '2026-11-09T19:00:00.000Z', '2026-11-09T19:30:00.000Z');
      const manana = await cita(dentistId, '2026-11-09T13:00:00.000Z', '2026-11-09T13:30:00.000Z');
      await cita(dentistId, '2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');

      const res = await conToken(http().get(ruta('/dentists/me/agenda')), token);

      expect(ids(res.body)).toEqual([manana.id, tarde.id]);
    });

    it('con fecha devuelve las citas de ese día', async () => {
      const { dentistId, token } = await odontologoConToken();
      const martes = await cita(dentistId, '2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');
      await cita(dentistId, '2026-11-09T13:00:00.000Z', '2026-11-09T13:30:00.000Z');

      const res = await conToken(
        http().get(ruta('/dentists/me/agenda')).query({ fecha: '2026-11-10' }),
        token,
      );

      expect(ids(res.body)).toEqual([martes.id]);
    });

    it('no muestra las citas CANCELADA (D8), pero sí las FINALIZADA', async () => {
      const { dentistId, token } = await odontologoConToken();
      await cita(dentistId, '2026-11-09T13:00:00.000Z', '2026-11-09T13:30:00.000Z', 'CANCELADA');
      const finalizada = await cita(
        dentistId,
        '2026-11-09T14:00:00.000Z',
        '2026-11-09T14:30:00.000Z',
        'FINALIZADA',
      );

      const res = await conToken(http().get(ruta('/dentists/me/agenda')), token);

      expect(ids(res.body)).toEqual([finalizada.id]);
    });

    it('cada cita incluye paciente, servicio, estado y observación', async () => {
      const { dentistId, token } = await odontologoConToken();
      const creada = await cita(
        dentistId,
        '2026-11-09T14:00:00.000Z',
        '2026-11-09T14:30:00.000Z',
        'FINALIZADA',
      );
      await prisma.observation.create({
        data: { appointmentId: creada.id, texto: 'Sin novedades' },
      });

      const res = await conToken(http().get(ruta('/dentists/me/agenda')), token);

      const [item] = res.body;
      expect(item).toMatchObject({
        estado: 'FINALIZADA',
        servicio: { id: creada.serviceId },
        paciente: { id: creada.patientId },
        observacion: { texto: 'Sin novedades' },
      });
    });

    it('responde 400 con una fecha que no existe', async () => {
      const { token } = await odontologoConToken();

      const res = await conToken(
        http().get(ruta('/dentists/me/agenda')).query({ fecha: '2026-02-30' }),
        token,
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FECHA_INVALIDA');
    });
  });

  describe('GET /dentists/me/agenda/upcoming', () => {
    it('devuelve solo las citas propias que no han empezado, de la más cercana a la más lejana', async () => {
      const { dentistId, token } = await odontologoConToken();
      const otro = await odontologoConToken();
      const lejana = await cita(dentistId, '2026-11-12T13:00:00.000Z', '2026-11-12T13:30:00.000Z');
      const cercana = await cita(dentistId, '2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');
      await cita(dentistId, '2026-11-09T13:00:00.000Z', '2026-11-09T13:30:00.000Z');
      await cita(otro.dentistId, '2026-11-11T13:00:00.000Z', '2026-11-11T13:30:00.000Z');

      const res = await conToken(http().get(ruta('/dentists/me/agenda/upcoming')), token);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([cercana.id, lejana.id]);
    });

    it.each(['CANCELADA', 'FINALIZADA'] as const)('no incluye las citas %s', async (estado) => {
      const { dentistId, token } = await odontologoConToken();
      await cita(dentistId, '2026-11-11T13:00:00.000Z', '2026-11-11T13:30:00.000Z', estado);

      const res = await conToken(http().get(ruta('/dentists/me/agenda/upcoming')), token);

      expect(res.body).toEqual([]);
    });

    it('respeta el limit', async () => {
      const { dentistId, token } = await odontologoConToken();
      const primera = await cita(dentistId, '2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');
      await cita(dentistId, '2026-11-11T13:00:00.000Z', '2026-11-11T13:30:00.000Z');

      const res = await conToken(
        http().get(ruta('/dentists/me/agenda/upcoming')).query({ limit: 1 }),
        token,
      );

      expect(ids(res.body)).toEqual([primera.id]);
    });

    it.each([
      ['cero', { limit: 0 }],
      ['mayor que 100', { limit: 101 }],
      ['que no es un número', { limit: 'muchas' }],
    ])('responde 400 con un limit %s', async (_caso, query) => {
      const { token } = await odontologoConToken();

      const res = await conToken(
        http().get(ruta('/dentists/me/agenda/upcoming')).query(query),
        token,
      );

      expect(res.status).toBe(400);
    });
  });
});
