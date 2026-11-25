import { INestApplication } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createAppointment, createDentist, createPatient } from '../helpers/factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Estados y observación (integración)', () => {
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

  async function scenario(status: AppointmentStatus = 'PENDIENTE') {
    const dentist = await createDentist(prisma);
    const appointment = await createAppointment(prisma, {
      dentistId: dentist.dentist!.id,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
      estado: status,
    });
    return { appointment, dentist, dentistToken: await loginAs(app, dentist) };
  }
  const adminToken = async () => loginAs(app, await createAdmin(prisma));

  const changeStatus = (id: string, token: string, status: string) =>
    withToken(http().patch(apiPath(`/appointments/${id}/status`)), token).send({ estado: status });
  const register = (id: string, token: string, text: unknown) =>
    withToken(http().post(apiPath(`/appointments/${id}/observation`)), token).send({ texto: text });
  const statusInDb = async (id: string) =>
    (await prisma.appointment.findUniqueOrThrow({ where: { id } })).estado;

  describe('PATCH /appointments/:id/status', () => {
    it('responde 401 sin token', async () => {
      const { appointment } = await scenario();

      const res = await http()
        .patch(apiPath(`/appointments/${appointment.id}/status`))
        .send({ estado: 'CONFIRMADA' });

      expect(res.status).toBe(401);
    });

    it('responde 403 a un paciente, también al dueño, y la cita no cambia', async () => {
      const { appointment } = await scenario();
      const { user } = await prisma.patient.findUniqueOrThrow({
        where: { id: appointment.patientId },
        include: { user: true },
      });
      const token = await loginAs(app, await createPatient(prisma));
      const ownerToken = await loginAs(app, { email: user.email, password: 'secreta123' });

      const other = await changeStatus(appointment.id, token, 'CONFIRMADA');
      const own = await changeStatus(appointment.id, ownerToken, 'CONFIRMADA');

      expect(other.status).toBe(403);
      expect(own.status).toBe(403);
      expect(await statusInDb(appointment.id)).toBe('PENDIENTE');
    });

    it('recorre PENDIENTE, CONFIRMADA, EN_ATENCION y FINALIZADA', async () => {
      const { appointment, dentistToken } = await scenario();
      const admin = await adminToken();

      const confirm = await changeStatus(appointment.id, admin, 'CONFIRMADA');
      expect(confirm.status).toBe(200);
      expect(confirm.body.estado).toBe('CONFIRMADA');
      expect(await statusInDb(appointment.id)).toBe('CONFIRMADA');

      const startCare = await changeStatus(appointment.id, dentistToken, 'EN_ATENCION');
      expect(startCare.status).toBe(200);
      expect(await statusInDb(appointment.id)).toBe('EN_ATENCION');

      await register(appointment.id, dentistToken, 'Limpieza sin complicaciones').expect(201);

      const finish = await changeStatus(appointment.id, dentistToken, 'FINALIZADA');
      expect(finish.status).toBe(200);
      expect(finish.body).toMatchObject({
        estado: 'FINALIZADA',
        observacion: { texto: 'Limpieza sin complicaciones' },
      });
      expect(await statusInDb(appointment.id)).toBe('FINALIZADA');
    });

    it('finalizar sin observación responde 409 y la cita sigue EN_ATENCION', async () => {
      const { appointment, dentistToken } = await scenario('EN_ATENCION');

      const res = await changeStatus(appointment.id, dentistToken, 'FINALIZADA');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OBSERVACION_REQUERIDA');
      expect(await statusInDb(appointment.id)).toBe('EN_ATENCION');
    });

    it('otro odontólogo recibe 403 y la cita no cambia', async () => {
      const { appointment } = await scenario('CONFIRMADA');
      const token = await loginAs(app, await createDentist(prisma));

      const res = await changeStatus(appointment.id, token, 'EN_ATENCION');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      expect(await statusInDb(appointment.id)).toBe('CONFIRMADA');
    });

    it('el odontólogo asignado confirma su cita PENDIENTE (D2)', async () => {
      const { appointment, dentistToken } = await scenario();

      const res = await changeStatus(appointment.id, dentistToken, 'CONFIRMADA');

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('CONFIRMADA');
      expect(await statusInDb(appointment.id)).toBe('CONFIRMADA');
    });

    it('otro odontólogo no confirma una cita PENDIENTE ajena', async () => {
      const { appointment } = await scenario();
      const token = await loginAs(app, await createDentist(prisma));

      const res = await changeStatus(appointment.id, token, 'CONFIRMADA');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      expect(await statusInDb(appointment.id)).toBe('PENDIENTE');
    });

    it('el ADMIN no inicia la atención', async () => {
      const { appointment } = await scenario('CONFIRMADA');
      const token = await adminToken();

      const res = await changeStatus(appointment.id, token, 'EN_ATENCION');

      expect(res.status).toBe(403);
      expect(await statusInDb(appointment.id)).toBe('CONFIRMADA');
    });

    it.each([
      ['PENDIENTE', 'EN_ATENCION'],
      ['PENDIENTE', 'FINALIZADA'],
      ['CONFIRMADA', 'FINALIZADA'],
      ['EN_ATENCION', 'CONFIRMADA'],
      ['FINALIZADA', 'CONFIRMADA'],
      ['CANCELADA', 'CONFIRMADA'],
    ] as const)('responde 409 con la transición inválida %s -> %s', async (from, to) => {
      const { appointment, dentistToken } = await scenario(from);

      const res = await changeStatus(appointment.id, dentistToken, to);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('TRANSICION_DE_ESTADO_INVALIDA');
      expect(res.body.message).not.toContain('_');
      expect(await statusInDb(appointment.id)).toBe(from);
    });

    it('una cita FINALIZADA no vuelve a PENDIENTE: responde 409 y no cambia', async () => {
      const { appointment } = await scenario('FINALIZADA');
      const token = await adminToken();

      const res = await changeStatus(appointment.id, token, 'PENDIENTE');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('TRANSICION_DE_ESTADO_INVALIDA');
      expect(await statusInDb(appointment.id)).toBe('FINALIZADA');
    });

    it.each(['CANCELADA', 'PERDIDA'])('responde 400 con estado %s', async (status) => {
      const { appointment } = await scenario();
      const token = await adminToken();

      const res = await changeStatus(appointment.id, token, status);

      expect(res.status).toBe(400);
      expect(await statusInDb(appointment.id)).toBe('PENDIENTE');
    });

    it('responde 404 si la cita no existe', async () => {
      const token = await adminToken();

      const res = await changeStatus(MISSING_ID, token, 'CONFIRMADA');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /appointments/:id/observation', () => {
    it('responde 401 sin token', async () => {
      const { appointment } = await scenario('EN_ATENCION');

      const res = await http()
        .post(apiPath(`/appointments/${appointment.id}/observation`))
        .send({ texto: 'Bien' });

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', createPatient],
      ['ADMIN', createAdmin],
    ])('responde 403 con el rol %s y no guarda nada', async (_role, create) => {
      const { appointment } = await scenario('EN_ATENCION');
      const token = await loginAs(app, await create(prisma));

      const res = await register(appointment.id, token, 'Bien');

      expect(res.status).toBe(403);
      expect(await prisma.observation.count()).toBe(0);
    });

    it('otro odontólogo recibe 403 y no guarda nada', async () => {
      const { appointment } = await scenario('EN_ATENCION');
      const token = await loginAs(app, await createDentist(prisma));

      const res = await register(appointment.id, token, 'Bien');

      expect(res.status).toBe(403);
      expect(await prisma.observation.count()).toBe(0);
    });

    it('la registra, la persiste y aparece en la cita', async () => {
      const { appointment, dentistToken } = await scenario('EN_ATENCION');

      const res = await register(appointment.id, dentistToken, '  Limpieza sin complicaciones  ');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        texto: 'Limpieza sin complicaciones',
        createdAt: expect.any(String),
      });
      const inDb = await prisma.observation.findUnique({
        where: { appointmentId: appointment.id },
      });
      expect(inDb!.texto).toBe('Limpieza sin complicaciones');
      const detail = await withToken(
        http().get(apiPath(`/appointments/${appointment.id}`)),
        dentistToken,
      );
      expect(detail.body.observacion.texto).toBe('Limpieza sin complicaciones');
    });

    it.each(['PENDIENTE', 'CONFIRMADA', 'FINALIZADA', 'CANCELADA'] as const)(
      'responde 409 en una cita %s y no guarda nada',
      async (status) => {
        const { appointment, dentistToken } = await scenario(status);

        const res = await register(appointment.id, dentistToken, 'Bien');

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CITA_NO_EN_ATENCION');
        expect(await prisma.observation.count()).toBe(0);
      },
    );

    it('una segunda observación responde 409 y conserva la primera (D5)', async () => {
      const { appointment, dentistToken } = await scenario('EN_ATENCION');
      await register(appointment.id, dentistToken, 'Primera').expect(201);

      const res = await register(appointment.id, dentistToken, 'Segunda');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OBSERVACION_YA_REGISTRADA');
      const inDb = await prisma.observation.findUnique({
        where: { appointmentId: appointment.id },
      });
      expect(inDb!.texto).toBe('Primera');
    });

    it('dos observaciones simultáneas: una da 201 y la otra 409', async () => {
      const { appointment, dentistToken } = await scenario('EN_ATENCION');

      const responses = await Promise.all([
        register(appointment.id, dentistToken, 'Una'),
        register(appointment.id, dentistToken, 'Otra'),
      ]);

      expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(await prisma.observation.count()).toBe(1);
    });

    it.each([
      ['vacío', ''],
      ['solo con espacios', '   '],
      ['de más de 2000 caracteres', 'x'.repeat(2001)],
      ['que no es texto', 5],
      ['ausente', undefined],
    ])('responde 400 con un texto %s', async (_testCase, text) => {
      const { appointment, dentistToken } = await scenario('EN_ATENCION');

      const res = await register(appointment.id, dentistToken, text);

      expect(res.status).toBe(400);
      expect(await prisma.observation.count()).toBe(0);
    });

    it('acepta un texto de 2000 caracteres', async () => {
      const { appointment, dentistToken } = await scenario('EN_ATENCION');

      const res = await register(appointment.id, dentistToken, 'x'.repeat(2000));

      expect(res.status).toBe(201);
    });

    it('responde 404 si la cita no existe', async () => {
      const { dentistToken } = await scenario();

      const res = await register(MISSING_ID, dentistToken, 'Bien');

      expect(res.status).toBe(404);
    });
  });
});
