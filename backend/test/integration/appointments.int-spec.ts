import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { SlotUnavailableError } from '../../src/common/errors/domain-error';
import { AppointmentsRepository } from '../../src/modules/appointments/appointments.repository';
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
const NINE_AM = '2026-11-10T13:00:00.000Z'; // Martes 09:00 en La Paz.

describe('Citas (integración)', () => {
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
  const newPatient = async () => {
    const patient = await createPatient(prisma);
    return { patient, token: await loginAs(app, patient) };
  };

  // Odontólogo que realiza un servicio de 30 minutos y atiende los martes de 09:00 a 12:00.
  async function scenario() {
    const service = await createService(prisma, { duracionMin: 30 });
    const dentist = await createDentist(prisma);
    const dentistId = dentist.dentist!.id;
    await prisma.dentistService.create({ data: { dentistId, serviceId: service.id } });
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: TUESDAY, minutoInicio: 540, minutoFin: 720 },
    });
    return { service, dentist, dentistId };
  }

  const book = (token: string, body: object) =>
    withToken(http().post(apiPath('/appointments')), token).send(body);

  describe('POST /appointments', () => {
    it('responde 401 sin token', async () => {
      const res = await http().post(apiPath('/appointments')).send({});

      expect(res.status).toBe(401);
    });

    it.each([
      ['ODONTOLOGO', createDentist],
      ['ADMIN', createAdmin],
    ])('responde 403 con el rol %s', async (_role, create) => {
      const { dentistId, service } = await scenario();
      const token = await loginAs(app, await create(prisma));

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      });

      expect(res.status).toBe(403);
      expect(await prisma.appointment.count()).toBe(0);
    });

    it('crea la cita PENDIENTE, calcula la hora de fin y la persiste', async () => {
      const { dentistId, service, dentist } = await scenario();
      const { patient, token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        horaInicio: NINE_AM,
        horaFin: '2026-11-10T13:30:00.000Z',
        estado: 'PENDIENTE',
        createdAt: expect.any(String),
        servicio: { id: service.id, nombre: service.nombre, duracionMin: 30 },
        odontologo: {
          id: dentistId,
          nombre: dentist.dentist!.nombre,
          especialidad: dentist.dentist!.especialidad,
        },
        paciente: {
          id: patient.patient!.id,
          nombre: patient.patient!.nombre,
          apellido: patient.patient!.apellido,
          telefono: null,
        },
        observacion: null,
      });
      const inDb = await prisma.appointment.findUnique({ where: { id: res.body.id } });
      expect(inDb).toMatchObject({
        patientId: patient.patient!.id,
        dentistId,
        serviceId: service.id,
        horaInicio: new Date(NINE_AM),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
        estado: 'PENDIENTE',
      });
    });

    it('rechaza la segunda reserva del mismo horario y conserva la primera', async () => {
      const { dentistId, service } = await scenario();
      const one = await newPatient();
      const two = await newPatient();
      const body = { dentistId, serviceId: service.id, horaInicio: NINE_AM };
      await book(one.token, body).expect(201);

      const res = await book(two.token, body);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      expect(await prisma.appointment.count()).toBe(1);
    });

    it('con dos reservas simultáneas al mismo horario, una da 201 y la otra 409', async () => {
      const { dentistId, service } = await scenario();
      const one = await newPatient();
      const two = await newPatient();
      const body = { dentistId, serviceId: service.id, horaInicio: NINE_AM };

      const responses = await Promise.all([book(one.token, body), book(two.token, body)]);

      expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(await prisma.appointment.count()).toBe(1);
    });

    it('rechaza una reserva que se solapa solo en parte con otra cita', async () => {
      const { dentistId, service } = await scenario();
      const one = await newPatient();
      const two = await newPatient();
      await book(one.token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      }).expect(201);

      const res = await book(two.token, {
        dentistId,
        serviceId: service.id,
        horaInicio: '2026-11-10T13:15:00.000Z',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      expect(await prisma.appointment.count()).toBe(1);
    });

    it('permite reservar un horario consecutivo a otra cita', async () => {
      const { dentistId, service } = await scenario();
      const one = await newPatient();
      const two = await newPatient();
      await book(one.token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      }).expect(201);

      const res = await book(two.token, {
        dentistId,
        serviceId: service.id,
        horaInicio: '2026-11-10T13:30:00.000Z',
      });

      expect(res.status).toBe(201);
    });

    it('el mismo horario con otro odontólogo sí se puede reservar', async () => {
      const one = await scenario();
      const two = await scenario();
      const { token } = await newPatient();
      await book(token, {
        dentistId: one.dentistId,
        serviceId: one.service.id,
        horaInicio: NINE_AM,
      }).expect(201);

      const res = await book(token, {
        dentistId: two.dentistId,
        serviceId: two.service.id,
        horaInicio: NINE_AM,
      });

      expect(res.status).toBe(201);
    });

    it.each([
      ['fuera del horario de atención', '2026-11-10T20:00:00.000Z'],
      ['un día que no atiende', '2026-11-11T13:00:00.000Z'],
      ['sin caber la duración al final del tramo', '2026-11-10T15:45:00.000Z'],
      ['que no coincide con el paso de 15 minutos', '2026-11-10T13:05:00.000Z'],
    ])('responde 409 HORARIO_NO_DISPONIBLE %s', async (_testCase, startsAt) => {
      const { dentistId, service } = await scenario();
      const { token } = await newPatient();

      const res = await book(token, { dentistId, serviceId: service.id, horaInicio: startsAt });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      expect(await prisma.appointment.count()).toBe(0);
    });

    it('responde 409 HORARIO_NO_DISPONIBLE sobre un bloque no disponible', async () => {
      const { dentistId, service } = await scenario();
      await prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date(NINE_AM),
          fin: new Date('2026-11-10T14:00:00.000Z'),
        },
      });
      const { token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
    });

    it('responde 409 HORARIO_EN_EL_PASADO si ya pasó', async () => {
      const { dentistId, service } = await scenario();
      const { token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: '2026-11-03T13:00:00.000Z',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_EN_EL_PASADO');
    });

    it('responde 409 si el servicio está deshabilitado', async () => {
      const { dentistId, service } = await scenario();
      await prisma.service.update({ where: { id: service.id }, data: { activo: false } });
      const { token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SERVICIO_DESHABILITADO');
    });

    it('responde 409 si el odontólogo no acepta citas', async () => {
      const { dentistId, service } = await scenario();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });
      const { token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
    });

    it('responde 409 si el odontólogo no realiza el servicio', async () => {
      const { dentistId } = await scenario();
      const other = await createService(prisma);
      const { token } = await newPatient();

      const res = await book(token, { dentistId, serviceId: other.id, horaInicio: NINE_AM });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ODONTOLOGO_NO_REALIZA_SERVICIO');
    });

    it('responde 404 si el odontólogo o el servicio no existen', async () => {
      const { dentistId, service } = await scenario();
      const { token } = await newPatient();

      const withoutDentist = await book(token, {
        dentistId: MISSING_ID,
        serviceId: service.id,
        horaInicio: NINE_AM,
      });
      const withoutService = await book(token, {
        dentistId,
        serviceId: MISSING_ID,
        horaInicio: NINE_AM,
      });

      expect(withoutDentist.status).toBe(404);
      expect(withoutService.status).toBe(404);
    });

    it.each([
      ['horaFin', { horaFin: NINE_AM }],
      ['estado', { estado: 'CONFIRMADA' }],
      ['patientId', { patientId: MISSING_ID }],
    ])('rechaza con 400 que el cliente envíe %s', async (_field, extra) => {
      const { dentistId, service } = await scenario();
      const { token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
        ...extra,
      });

      expect(res.status).toBe(400);
      expect(await prisma.appointment.count()).toBe(0);
    });

    it.each([
      ['sin horaInicio', { horaInicio: undefined }],
      ['con una fecha sin zona horaria', { horaInicio: '2026-11-10T13:00:00' }],
      ['con una fecha que no existe', { horaInicio: '2026-02-30T13:00:00.000Z' }],
      ['con un dentistId mal formado', { dentistId: 'x' }],
      ['con un serviceId mal formado', { serviceId: 'x' }],
    ])('responde 400 %s', async (_testCase, changes) => {
      const { dentistId, service } = await scenario();
      const { token } = await newPatient();

      const res = await book(token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
        ...changes,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('constraint de exclusión', () => {
    it('el repository traduce appointment_no_overlap a SlotUnavailableError', async () => {
      const { dentistId, service } = await scenario();
      const { patient } = await newPatient();
      const data = {
        dentistId,
        serviceId: service.id,
        patientId: patient.patient!.id,
        horaInicio: new Date(NINE_AM),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
      };
      await createAppointment(prisma, {
        dentistId,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
      });
      const repository = app.get(AppointmentsRepository);

      const attempt = repository.withDentistLock(dentistId, (tx) => repository.create(tx, data));

      await expect(attempt).rejects.toThrow(SlotUnavailableError);
    });
  });

  describe('GET /appointments/mine', () => {
    const patientAppointment = async (
      patientId: string,
      dentistId: string,
      serviceId: string,
      startsAt: string,
      endsAt: string,
      status: 'PENDIENTE' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA' = 'PENDIENTE',
    ) =>
      prisma.appointment.create({
        data: {
          patientId,
          dentistId,
          serviceId,
          horaInicio: new Date(startsAt),
          horaFin: new Date(endsAt),
          estado: status,
        },
      });

    it('responde 401 sin token', async () => {
      const res = await http().get(apiPath('/appointments/mine'));

      expect(res.status).toBe(401);
    });

    it.each([
      ['ODONTOLOGO', createDentist],
      ['ADMIN', createAdmin],
    ])('responde 403 con el rol %s', async (_role, create) => {
      const token = await loginAs(app, await create(prisma));

      const res = await withToken(http().get(apiPath('/appointments/mine')), token);

      expect(res.status).toBe(403);
    });

    it('un paciente solo ve sus propias citas', async () => {
      const { dentistId, service } = await scenario();
      const one = await newPatient();
      const two = await newPatient();
      const mine = await patientAppointment(
        one.patient.patient!.id,
        dentistId,
        service.id,
        NINE_AM,
        '2026-11-10T13:30:00.000Z',
      );
      await patientAppointment(
        two.patient.patient!.id,
        dentistId,
        service.id,
        '2026-11-10T14:00:00.000Z',
        '2026-11-10T14:30:00.000Z',
      );

      const res = await withToken(http().get(apiPath('/appointments/mine')), one.token);

      expect(res.status).toBe(200);
      expect((res.body as { id: string }[]).map((c) => c.id)).toEqual([mine.id]);
    });

    it('separa próximas e historial, cada una en su orden', async () => {
      const { dentistId, service } = await scenario();
      const { patient, token } = await newPatient();
      const patientId = patient.patient!.id;
      const create = (start: string, end: string, status?: 'FINALIZADA' | 'CANCELADA') =>
        patientAppointment(patientId, dentistId, service.id, start, end, status);
      const lejana = await create('2026-11-12T13:00:00.000Z', '2026-11-12T13:30:00.000Z');
      const cercana = await create('2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');
      const past = await create(
        '2026-11-02T13:00:00.000Z',
        '2026-11-02T13:30:00.000Z',
        'FINALIZADA',
      );
      const cancelled = await create(
        '2026-11-11T13:00:00.000Z',
        '2026-11-11T13:30:00.000Z',
        'CANCELADA',
      );

      const upcoming = await withToken(
        http().get(apiPath('/appointments/mine')).query({ cuando: 'proximas' }),
        token,
      );
      const history = await withToken(
        http().get(apiPath('/appointments/mine')).query({ cuando: 'historial' }),
        token,
      );

      expect((upcoming.body as { id: string }[]).map((c) => c.id)).toEqual([cercana.id, lejana.id]);
      expect((history.body as { id: string }[]).map((c) => c.id)).toEqual([cancelled.id, past.id]);
    });

    it('responde 400 con un valor de cuando desconocido', async () => {
      const { token } = await newPatient();

      const res = await withToken(
        http().get(apiPath('/appointments/mine')).query({ cuando: 'ayer' }),
        token,
      );

      expect(res.status).toBe(400);
    });
  });

  describe('GET /appointments/:id', () => {
    async function bookedAppointment() {
      const { dentistId, service, dentist } = await scenario();
      const owner = await newPatient();
      const res = await book(owner.token, {
        dentistId,
        serviceId: service.id,
        horaInicio: NINE_AM,
      }).expect(201);
      return { appointmentId: res.body.id as string, owner, dentist };
    }

    it('responde 401 sin token', async () => {
      const res = await http().get(apiPath(`/appointments/${MISSING_ID}`));

      expect(res.status).toBe(401);
    });

    it('la entrega al paciente dueño', async () => {
      const { appointmentId, owner } = await bookedAppointment();

      const res = await withToken(
        http().get(apiPath(`/appointments/${appointmentId}`)),
        owner.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(appointmentId);
    });

    it('la entrega al odontólogo asignado', async () => {
      const { appointmentId, dentist } = await bookedAppointment();
      const token = await loginAs(app, dentist);

      const res = await withToken(http().get(apiPath(`/appointments/${appointmentId}`)), token);

      expect(res.status).toBe(200);
    });

    it('la entrega al ADMIN', async () => {
      const { appointmentId } = await bookedAppointment();
      const token = await loginAs(app, await createAdmin(prisma));

      const res = await withToken(http().get(apiPath(`/appointments/${appointmentId}`)), token);

      expect(res.status).toBe(200);
    });

    it('responde 403 a otro paciente, sin revelar datos de la cita', async () => {
      const { appointmentId } = await bookedAppointment();
      const { token } = await newPatient();

      const res = await withToken(http().get(apiPath(`/appointments/${appointmentId}`)), token);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      expect(res.body).not.toHaveProperty('horaInicio');
      expect(res.body).not.toHaveProperty('paciente');
    });

    it('responde 403 a otro odontólogo', async () => {
      const { appointmentId } = await bookedAppointment();
      const token = await loginAs(app, await createDentist(prisma));

      const res = await withToken(http().get(apiPath(`/appointments/${appointmentId}`)), token);

      expect(res.status).toBe(403);
    });

    it('responde 404 si la cita no existe', async () => {
      const { token } = await newPatient();

      const res = await withToken(http().get(apiPath(`/appointments/${MISSING_ID}`)), token);

      expect(res.status).toBe(404);
    });

    it('responde 400 con un id mal formado', async () => {
      const { token } = await newPatient();

      const res = await withToken(http().get(apiPath('/appointments/no-es-uuid')), token);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /appointments', () => {
    const adminToken = async () => loginAs(app, await createAdmin(prisma));
    const ids = (body: unknown) => (body as { id: string }[]).map((c) => c.id);

    it('responde 401 sin token', async () => {
      const res = await http().get(apiPath('/appointments'));

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', createPatient],
      ['ODONTOLOGO', createDentist],
    ])('responde 403 con el rol %s', async (_role, create) => {
      const token = await loginAs(app, await create(prisma));

      const res = await withToken(http().get(apiPath('/appointments')), token);

      expect(res.status).toBe(403);
    });

    it('devuelve todas las citas, de la más reciente a la más antigua', async () => {
      const one = await scenario();
      const two = await scenario();
      const old = await createAppointment(prisma, {
        dentistId: one.dentistId,
        horaInicio: new Date('2026-11-10T13:00:00.000Z'),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
      });
      const newAppointment = await createAppointment(prisma, {
        dentistId: two.dentistId,
        horaInicio: new Date('2026-11-11T13:00:00.000Z'),
        horaFin: new Date('2026-11-11T13:30:00.000Z'),
      });
      const token = await adminToken();

      const res = await withToken(http().get(apiPath('/appointments')), token);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([newAppointment.id, old.id]);
    });

    it('filtra por fecha en la zona de la clínica, estado y odontólogo', async () => {
      const one = await scenario();
      const two = await scenario();
      // El martes a las 23:00 en La Paz ya es miércoles en UTC.
      const night = await createAppointment(prisma, {
        dentistId: one.dentistId,
        horaInicio: new Date('2026-11-11T03:00:00.000Z'),
        horaFin: new Date('2026-11-11T03:30:00.000Z'),
      });
      const confirmed = await createAppointment(prisma, {
        dentistId: two.dentistId,
        horaInicio: new Date('2026-11-12T13:00:00.000Z'),
        horaFin: new Date('2026-11-12T13:30:00.000Z'),
        estado: 'CONFIRMADA',
      });
      const token = await adminToken();
      const fetchSlots = (query: object) =>
        withToken(http().get(apiPath('/appointments')).query(query), token);

      const byDate = await fetchSlots({ fecha: '2026-11-10' });
      const byStatus = await fetchSlots({ estado: 'CONFIRMADA' });
      const byDentist = await fetchSlots({ dentistId: one.dentistId });

      expect(ids(byDate.body)).toEqual([night.id]);
      expect(ids(byStatus.body)).toEqual([confirmed.id]);
      expect(ids(byDentist.body)).toEqual([night.id]);
    });

    it('pagina con limit y offset', async () => {
      const { dentistId } = await scenario();
      const first = await createAppointment(prisma, {
        dentistId,
        horaInicio: new Date('2026-11-12T13:00:00.000Z'),
        horaFin: new Date('2026-11-12T13:30:00.000Z'),
      });
      const second = await createAppointment(prisma, {
        dentistId,
        horaInicio: new Date('2026-11-11T13:00:00.000Z'),
        horaFin: new Date('2026-11-11T13:30:00.000Z'),
      });
      const token = await adminToken();

      const page1 = await withToken(
        http().get(apiPath('/appointments')).query({ limit: 1 }),
        token,
      );
      const page2 = await withToken(
        http().get(apiPath('/appointments')).query({ limit: 1, offset: 1 }),
        token,
      );

      expect(ids(page1.body)).toEqual([first.id]);
      expect(ids(page2.body)).toEqual([second.id]);
    });

    it.each([
      ['limit mayor que 100', { limit: 101 }],
      ['limit cero', { limit: 0 }],
      ['offset negativo', { offset: -1 }],
      ['estado desconocido', { estado: 'PERDIDA' }],
      ['dentistId mal formado', { dentistId: 'x' }],
      ['fecha que no existe', { fecha: '2026-02-30' }],
    ])('responde 400 con %s', async (_testCase, query) => {
      const token = await adminToken();

      const res = await withToken(http().get(apiPath('/appointments')).query(query), token);

      expect(res.status).toBe(400);
    });
  });
});
