import { INestApplication } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
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
const DATE = '2026-11-10';
const NINE_AM = '2026-11-10T13:00:00.000Z'; // Martes 09:00 en La Paz.
const NINE_FIFTEEN = '2026-11-10T13:15:00.000Z';
const TEN_AM = '2026-11-10T14:00:00.000Z';

describe('Reprogramar y cancelar (integración)', () => {
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

  // Paciente con una cita de 30 minutos a las 09:00; el odontólogo atiende de 09:00 a 12:00.
  async function scenario(status: AppointmentStatus = 'PENDIENTE') {
    const service = await createService(prisma, { duracionMin: 30 });
    const dentist = await createDentist(prisma);
    const dentistId = dentist.dentist!.id;
    await prisma.dentistService.create({ data: { dentistId, serviceId: service.id } });
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: TUESDAY, minutoInicio: 540, minutoFin: 720 },
    });
    const patient = await createPatient(prisma);
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.patient!.id,
        dentistId,
        serviceId: service.id,
        horaInicio: new Date(NINE_AM),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
        estado: status,
      },
    });
    return {
      appointment,
      service,
      dentistId,
      dentist,
      patient,
      token: await loginAs(app, patient),
    };
  }

  const reschedule = (id: string, token: string, startsAt: string) =>
    withToken(http().patch(apiPath(`/appointments/${id}/reschedule`)), token).send({
      horaInicio: startsAt,
    });
  const cancel = (id: string, token: string) =>
    withToken(http().patch(apiPath(`/appointments/${id}/cancel`)), token);
  const schedule = async (dentistId: string, serviceId: string, token: string) => {
    const res = await withToken(
      http()
        .get(apiPath(`/dentists/${dentistId}/slots`))
        .query({ serviceId, fecha: DATE }),
      token,
    );
    return (res.body as { inicio: string }[]).map((slot) => slot.inicio);
  };

  describe('PATCH /appointments/:id/cancel', () => {
    it('responde 401 sin token', async () => {
      const { appointment } = await scenario();

      const res = await http().patch(apiPath(`/appointments/${appointment.id}/cancel`));

      expect(res.status).toBe(401);
    });

    it('responde 403 al odontólogo, también al asignado, y la cita no cambia', async () => {
      const { appointment, dentist } = await scenario();
      const token = await loginAs(app, dentist);

      const res = await cancel(appointment.id, token);

      expect(res.status).toBe(403);
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.estado).toBe('PENDIENTE');
    });

    it('responde 403 a otro paciente y la cita no cambia', async () => {
      const { appointment } = await scenario();
      const token = await loginAs(app, await createPatient(prisma));

      const res = await cancel(appointment.id, token);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.estado).toBe('PENDIENTE');
    });

    it('el paciente la cancela y el horario vuelve a estar disponible', async () => {
      const { appointment, dentistId, service, token } = await scenario();
      expect(await schedule(dentistId, service.id, token)).not.toContain(NINE_AM);

      const res = await cancel(appointment.id, token);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: appointment.id, estado: 'CANCELADA' });
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.estado).toBe('CANCELADA');
      expect(await schedule(dentistId, service.id, token)).toContain(NINE_AM);
    });

    it('el ADMIN puede cancelar una cita CONFIRMADA', async () => {
      const { appointment } = await scenario('CONFIRMADA');
      const token = await loginAs(app, await createAdmin(prisma));

      const res = await cancel(appointment.id, token);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('CANCELADA');
    });

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
      'responde 409 con una cita %s y no cambia',
      async (status) => {
        const { appointment, token } = await scenario(status);

        const res = await cancel(appointment.id, token);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CITA_NO_MODIFICABLE');
        const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
        expect(inDb!.estado).toBe(status);
      },
    );

    it('el ADMIN tampoco cancela una cita EN_ATENCION (D1)', async () => {
      const { appointment } = await scenario('EN_ATENCION');
      const token = await loginAs(app, await createAdmin(prisma));

      const res = await cancel(appointment.id, token);

      expect(res.status).toBe(409);
    });

    it('responde 404 si la cita no existe', async () => {
      const { token } = await scenario();

      const res = await cancel(MISSING_ID, token);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /appointments/:id/reschedule', () => {
    it('responde 401 sin token', async () => {
      const { appointment } = await scenario();

      const res = await http()
        .patch(apiPath(`/appointments/${appointment.id}/reschedule`))
        .send({ horaInicio: TEN_AM });

      expect(res.status).toBe(401);
    });

    it('responde 403 al odontólogo asignado y la cita no cambia', async () => {
      const { appointment, dentist } = await scenario();
      const token = await loginAs(app, dentist);

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(403);
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.horaInicio).toEqual(new Date(NINE_AM));
    });

    it('responde 403 a otro paciente y la cita no cambia', async () => {
      const { appointment } = await scenario();
      const token = await loginAs(app, await createPatient(prisma));

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(403);
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.horaInicio).toEqual(new Date(NINE_AM));
    });

    it('cambia el horario de la misma fila, recalcula el fin y libera el anterior', async () => {
      const { appointment, dentistId, service, token } = await scenario();

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: appointment.id,
        horaInicio: TEN_AM,
        horaFin: '2026-11-10T14:30:00.000Z',
      });
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb).toMatchObject({
        horaInicio: new Date(TEN_AM),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });
      expect(await prisma.appointment.count()).toBe(1);
      const free = await schedule(dentistId, service.id, token);
      expect(free).toContain(NINE_AM);
      expect(free).not.toContain(TEN_AM);
    });

    it('permite moverla a un horario que se cruza con el suyo', async () => {
      const { appointment, token } = await scenario();

      const res = await reschedule(appointment.id, token, NINE_FIFTEEN);

      expect(res.status).toBe(200);
      expect(res.body.horaInicio).toBe(NINE_FIFTEEN);
    });

    it.each(['PENDIENTE', 'CONFIRMADA'] as const)(
      'una cita %s conserva su estado (D4)',
      async (status) => {
        const { appointment, token } = await scenario(status);

        const res = await reschedule(appointment.id, token, TEN_AM);

        expect(res.body.estado).toBe(status);
      },
    );

    it('el ADMIN puede reprogramar y se conserva el paciente', async () => {
      const { appointment, patient } = await scenario();
      const token = await loginAs(app, await createAdmin(prisma));

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(200);
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.patientId).toBe(patient.patient!.id);
    });

    it('a un horario ocupado responde 409 y la cita queda intacta', async () => {
      const { appointment, dentistId, token } = await scenario();
      await createAppointment(prisma, {
        dentistId,
        horaInicio: new Date(TEN_AM),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.horaInicio).toEqual(new Date(NINE_AM));
    });

    it('al competir con una reserva por el mismo horario, solo una gana', async () => {
      const { appointment, dentistId, service, token } = await scenario();
      const otherToken = await loginAs(app, await createPatient(prisma));

      const [rescheduling, booking] = await Promise.all([
        reschedule(appointment.id, token, TEN_AM),
        withToken(http().post(apiPath('/appointments')), otherToken).send({
          dentistId,
          serviceId: service.id,
          horaInicio: TEN_AM,
        }),
      ]);

      expect([rescheduling.status, booking.status].sort()).toEqual(
        rescheduling.status === 200 ? [200, 409] : [201, 409],
      );
      expect(await prisma.appointment.count({ where: { horaInicio: new Date(TEN_AM) } })).toBe(1);
    });

    it('el repository traduce appointment_no_overlap al actualizar el horario', async () => {
      const { appointment, dentistId } = await scenario();
      await createAppointment(prisma, {
        dentistId,
        horaInicio: new Date(TEN_AM),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });
      const repository = app.get(AppointmentsRepository);

      const attempt = repository.withDentistLock(dentistId, (tx) =>
        repository.updateTimes(tx, appointment.id, {
          horaInicio: new Date(TEN_AM),
          horaFin: new Date('2026-11-10T14:30:00.000Z'),
        }),
      );

      await expect(attempt).rejects.toThrow(SlotUnavailableError);
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.horaInicio).toEqual(new Date(NINE_AM));
    });

    it('a un horario en el pasado responde 409 y la cita queda intacta', async () => {
      const { appointment, token } = await scenario();

      const res = await reschedule(appointment.id, token, '2026-11-03T13:00:00.000Z');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_EN_EL_PASADO');
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb!.horaInicio).toEqual(new Date(NINE_AM));
    });

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
      'responde 409 con una cita %s',
      async (status) => {
        const { appointment, token } = await scenario(status);

        const res = await reschedule(appointment.id, token, TEN_AM);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CITA_NO_MODIFICABLE');
      },
    );

    it('responde 409 si el servicio se deshabilitó', async () => {
      const { appointment, service, token } = await scenario();
      await prisma.service.update({ where: { id: service.id }, data: { activo: false } });

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SERVICIO_DESHABILITADO');
    });

    it('responde 409 si el odontólogo ya no acepta citas', async () => {
      const { appointment, dentistId, token } = await scenario();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });

      const res = await reschedule(appointment.id, token, TEN_AM);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
    });

    it('responde 404 si la cita no existe', async () => {
      const { token } = await scenario();

      const res = await reschedule(MISSING_ID, token, TEN_AM);

      expect(res.status).toBe(404);
    });

    it.each([
      ['sin horaInicio', {}],
      ['con una fecha sin zona', { horaInicio: '2026-11-10T14:00:00' }],
      ['con un campo extra', { horaInicio: TEN_AM, dentistId: MISSING_ID }],
    ])('responde 400 %s', async (_testCase, body) => {
      const { appointment, token } = await scenario();

      const res = await withToken(
        http().patch(apiPath(`/appointments/${appointment.id}/reschedule`)),
        token,
      ).send(body);

      expect(res.status).toBe(400);
    });
  });
});
