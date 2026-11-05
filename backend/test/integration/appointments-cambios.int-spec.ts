import { INestApplication } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
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
const FECHA = '2026-11-10';
const LAS_NUEVE = '2026-11-10T13:00:00.000Z'; // Martes 09:00 en La Paz.
const NUEVE_Y_CUARTO = '2026-11-10T13:15:00.000Z';
const LAS_DIEZ = '2026-11-10T14:00:00.000Z';

describe('Reprogramar y cancelar (integración)', () => {
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

  // Paciente con una cita de 30 minutos a las 09:00; el odontólogo atiende de 09:00 a 12:00.
  async function escenario(estado: AppointmentStatus = 'PENDIENTE') {
    const servicio = await crearServicio(prisma, { duracionMin: 30 });
    const odontologo = await crearOdontologo(prisma);
    const dentistId = odontologo.dentist!.id;
    await prisma.dentistService.create({ data: { dentistId, serviceId: servicio.id } });
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: MARTES, minutoInicio: 540, minutoFin: 720 },
    });
    const paciente = await crearPaciente(prisma);
    const cita = await prisma.appointment.create({
      data: {
        patientId: paciente.patient!.id,
        dentistId,
        serviceId: servicio.id,
        horaInicio: new Date(LAS_NUEVE),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
        estado,
      },
    });
    return {
      cita,
      servicio,
      dentistId,
      odontologo,
      paciente,
      token: await loginComo(app, paciente),
    };
  }

  const reprogramar = (id: string, token: string, horaInicio: string) =>
    conToken(http().patch(ruta(`/appointments/${id}/reschedule`)), token).send({ horaInicio });
  const cancelar = (id: string, token: string) =>
    conToken(http().patch(ruta(`/appointments/${id}/cancel`)), token);
  const horarios = async (dentistId: string, serviceId: string, token: string) => {
    const res = await conToken(
      http()
        .get(ruta(`/dentists/${dentistId}/slots`))
        .query({ serviceId, fecha: FECHA }),
      token,
    );
    return (res.body as { inicio: string }[]).map((slot) => slot.inicio);
  };

  describe('PATCH /appointments/:id/cancel', () => {
    it('responde 401 sin token', async () => {
      const { cita } = await escenario();

      const res = await http().patch(ruta(`/appointments/${cita.id}/cancel`));

      expect(res.status).toBe(401);
    });

    it('responde 403 al odontólogo, también al asignado, y la cita no cambia', async () => {
      const { cita, odontologo } = await escenario();
      const token = await loginComo(app, odontologo);

      const res = await cancelar(cita.id, token);

      expect(res.status).toBe(403);
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.estado).toBe('PENDIENTE');
    });

    it('responde 403 a otro paciente y la cita no cambia', async () => {
      const { cita } = await escenario();
      const token = await loginComo(app, await crearPaciente(prisma));

      const res = await cancelar(cita.id, token);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.estado).toBe('PENDIENTE');
    });

    it('el paciente la cancela y el horario vuelve a estar disponible', async () => {
      const { cita, dentistId, servicio, token } = await escenario();
      expect(await horarios(dentistId, servicio.id, token)).not.toContain(LAS_NUEVE);

      const res = await cancelar(cita.id, token);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: cita.id, estado: 'CANCELADA' });
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.estado).toBe('CANCELADA');
      expect(await horarios(dentistId, servicio.id, token)).toContain(LAS_NUEVE);
    });

    it('el ADMIN puede cancelar una cita CONFIRMADA', async () => {
      const { cita } = await escenario('CONFIRMADA');
      const token = await loginComo(app, await crearAdmin(prisma));

      const res = await cancelar(cita.id, token);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('CANCELADA');
    });

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
      'responde 409 con una cita %s y no cambia',
      async (estado) => {
        const { cita, token } = await escenario(estado);

        const res = await cancelar(cita.id, token);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CITA_NO_MODIFICABLE');
        const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
        expect(enBd!.estado).toBe(estado);
      },
    );

    it('el ADMIN tampoco cancela una cita EN_ATENCION (D1)', async () => {
      const { cita } = await escenario('EN_ATENCION');
      const token = await loginComo(app, await crearAdmin(prisma));

      const res = await cancelar(cita.id, token);

      expect(res.status).toBe(409);
    });

    it('responde 404 si la cita no existe', async () => {
      const { token } = await escenario();

      const res = await cancelar(ID_INEXISTENTE, token);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /appointments/:id/reschedule', () => {
    it('responde 401 sin token', async () => {
      const { cita } = await escenario();

      const res = await http()
        .patch(ruta(`/appointments/${cita.id}/reschedule`))
        .send({ horaInicio: LAS_DIEZ });

      expect(res.status).toBe(401);
    });

    it('responde 403 al odontólogo asignado y la cita no cambia', async () => {
      const { cita, odontologo } = await escenario();
      const token = await loginComo(app, odontologo);

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(403);
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.horaInicio).toEqual(new Date(LAS_NUEVE));
    });

    it('responde 403 a otro paciente y la cita no cambia', async () => {
      const { cita } = await escenario();
      const token = await loginComo(app, await crearPaciente(prisma));

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(403);
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.horaInicio).toEqual(new Date(LAS_NUEVE));
    });

    it('cambia el horario de la misma fila, recalcula el fin y libera el anterior', async () => {
      const { cita, dentistId, servicio, token } = await escenario();

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: cita.id,
        horaInicio: LAS_DIEZ,
        horaFin: '2026-11-10T14:30:00.000Z',
      });
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd).toMatchObject({
        horaInicio: new Date(LAS_DIEZ),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });
      expect(await prisma.appointment.count()).toBe(1);
      const libres = await horarios(dentistId, servicio.id, token);
      expect(libres).toContain(LAS_NUEVE);
      expect(libres).not.toContain(LAS_DIEZ);
    });

    it('permite moverla a un horario que se cruza con el suyo', async () => {
      const { cita, token } = await escenario();

      const res = await reprogramar(cita.id, token, NUEVE_Y_CUARTO);

      expect(res.status).toBe(200);
      expect(res.body.horaInicio).toBe(NUEVE_Y_CUARTO);
    });

    it.each(['PENDIENTE', 'CONFIRMADA'] as const)(
      'una cita %s conserva su estado (D4)',
      async (estado) => {
        const { cita, token } = await escenario(estado);

        const res = await reprogramar(cita.id, token, LAS_DIEZ);

        expect(res.body.estado).toBe(estado);
      },
    );

    it('el ADMIN puede reprogramar y se conserva el paciente', async () => {
      const { cita, paciente } = await escenario();
      const token = await loginComo(app, await crearAdmin(prisma));

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(200);
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.patientId).toBe(paciente.patient!.id);
    });

    it('a un horario ocupado responde 409 y la cita queda intacta', async () => {
      const { cita, dentistId, token } = await escenario();
      await crearCita(prisma, {
        dentistId,
        horaInicio: new Date(LAS_DIEZ),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.horaInicio).toEqual(new Date(LAS_NUEVE));
    });

    it('a un horario en el pasado responde 409 y la cita queda intacta', async () => {
      const { cita, token } = await escenario();

      const res = await reprogramar(cita.id, token, '2026-11-03T13:00:00.000Z');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_EN_EL_PASADO');
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd!.horaInicio).toEqual(new Date(LAS_NUEVE));
    });

    it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
      'responde 409 con una cita %s',
      async (estado) => {
        const { cita, token } = await escenario(estado);

        const res = await reprogramar(cita.id, token, LAS_DIEZ);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CITA_NO_MODIFICABLE');
      },
    );

    it('responde 409 si el servicio se deshabilitó', async () => {
      const { cita, servicio, token } = await escenario();
      await prisma.service.update({ where: { id: servicio.id }, data: { activo: false } });

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SERVICIO_DESHABILITADO');
    });

    it('responde 409 si el odontólogo ya no acepta citas', async () => {
      const { cita, dentistId, token } = await escenario();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });

      const res = await reprogramar(cita.id, token, LAS_DIEZ);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
    });

    it('responde 404 si la cita no existe', async () => {
      const { token } = await escenario();

      const res = await reprogramar(ID_INEXISTENTE, token, LAS_DIEZ);

      expect(res.status).toBe(404);
    });

    it.each([
      ['sin horaInicio', {}],
      ['con una fecha sin zona', { horaInicio: '2026-11-10T14:00:00' }],
      ['con un campo extra', { horaInicio: LAS_DIEZ, dentistId: ID_INEXISTENTE }],
    ])('responde 400 %s', async (_caso, cuerpo) => {
      const { cita, token } = await escenario();

      const res = await conToken(
        http().patch(ruta(`/appointments/${cita.id}/reschedule`)),
        token,
      ).send(cuerpo);

      expect(res.status).toBe(400);
    });
  });
});
