import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { HorarioNoDisponibleError } from '../../src/common/errors/domain-error';
import { AppointmentsRepository } from '../../src/modules/appointments/appointments.repository';
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
const LAS_NUEVE = '2026-11-10T13:00:00.000Z'; // Martes 09:00 en La Paz.

describe('Citas (integración)', () => {
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
  const nuevoPaciente = async () => {
    const paciente = await crearPaciente(prisma);
    return { paciente, token: await loginComo(app, paciente) };
  };

  // Odontólogo que realiza un servicio de 30 minutos y atiende los martes de 09:00 a 12:00.
  async function escenario() {
    const servicio = await crearServicio(prisma, { duracionMin: 30 });
    const odontologo = await crearOdontologo(prisma);
    const dentistId = odontologo.dentist!.id;
    await prisma.dentistService.create({ data: { dentistId, serviceId: servicio.id } });
    await prisma.availabilityRule.create({
      data: { dentistId, diaSemana: MARTES, minutoInicio: 540, minutoFin: 720 },
    });
    return { servicio, odontologo, dentistId };
  }

  const reservar = (token: string, cuerpo: object) =>
    conToken(http().post(ruta('/appointments')), token).send(cuerpo);

  describe('POST /appointments', () => {
    it('responde 401 sin token', async () => {
      const res = await http().post(ruta('/appointments')).send({});

      expect(res.status).toBe(401);
    });

    it.each([
      ['ODONTOLOGO', crearOdontologo],
      ['ADMIN', crearAdmin],
    ])('responde 403 con el rol %s', async (_rol, crear) => {
      const { dentistId, servicio } = await escenario();
      const token = await loginComo(app, await crear(prisma));

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      });

      expect(res.status).toBe(403);
      expect(await prisma.appointment.count()).toBe(0);
    });

    it('crea la cita PENDIENTE, calcula la hora de fin y la persiste', async () => {
      const { dentistId, servicio, odontologo } = await escenario();
      const { paciente, token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        horaInicio: LAS_NUEVE,
        horaFin: '2026-11-10T13:30:00.000Z',
        estado: 'PENDIENTE',
        createdAt: expect.any(String),
        servicio: { id: servicio.id, nombre: servicio.nombre, duracionMin: 30 },
        odontologo: {
          id: dentistId,
          nombre: odontologo.dentist!.nombre,
          especialidad: odontologo.dentist!.especialidad,
        },
        paciente: {
          id: paciente.patient!.id,
          nombre: paciente.patient!.nombre,
          apellido: paciente.patient!.apellido,
          telefono: null,
        },
        observacion: null,
      });
      const enBd = await prisma.appointment.findUnique({ where: { id: res.body.id } });
      expect(enBd).toMatchObject({
        patientId: paciente.patient!.id,
        dentistId,
        serviceId: servicio.id,
        horaInicio: new Date(LAS_NUEVE),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
        estado: 'PENDIENTE',
      });
    });

    it('rechaza la segunda reserva del mismo horario y conserva la primera', async () => {
      const { dentistId, servicio } = await escenario();
      const uno = await nuevoPaciente();
      const dos = await nuevoPaciente();
      const cuerpo = { dentistId, serviceId: servicio.id, horaInicio: LAS_NUEVE };
      await reservar(uno.token, cuerpo).expect(201);

      const res = await reservar(dos.token, cuerpo);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      expect(await prisma.appointment.count()).toBe(1);
    });

    it('con dos reservas simultáneas al mismo horario, una da 201 y la otra 409', async () => {
      const { dentistId, servicio } = await escenario();
      const uno = await nuevoPaciente();
      const dos = await nuevoPaciente();
      const cuerpo = { dentistId, serviceId: servicio.id, horaInicio: LAS_NUEVE };

      const respuestas = await Promise.all([
        reservar(uno.token, cuerpo),
        reservar(dos.token, cuerpo),
      ]);

      expect(respuestas.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(await prisma.appointment.count()).toBe(1);
    });

    it('permite reservar un horario consecutivo a otra cita', async () => {
      const { dentistId, servicio } = await escenario();
      const uno = await nuevoPaciente();
      const dos = await nuevoPaciente();
      await reservar(uno.token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      }).expect(201);

      const res = await reservar(dos.token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: '2026-11-10T13:30:00.000Z',
      });

      expect(res.status).toBe(201);
    });

    it('el mismo horario con otro odontólogo sí se puede reservar', async () => {
      const uno = await escenario();
      const dos = await escenario();
      const { token } = await nuevoPaciente();
      await reservar(token, {
        dentistId: uno.dentistId,
        serviceId: uno.servicio.id,
        horaInicio: LAS_NUEVE,
      }).expect(201);

      const res = await reservar(token, {
        dentistId: dos.dentistId,
        serviceId: dos.servicio.id,
        horaInicio: LAS_NUEVE,
      });

      expect(res.status).toBe(201);
    });

    it.each([
      ['fuera del horario de atención', '2026-11-10T20:00:00.000Z'],
      ['un día que no atiende', '2026-11-11T13:00:00.000Z'],
      ['sin caber la duración al final del tramo', '2026-11-10T15:45:00.000Z'],
      ['que no coincide con el paso de 15 minutos', '2026-11-10T13:05:00.000Z'],
    ])('responde 409 HORARIO_NO_DISPONIBLE %s', async (_caso, horaInicio) => {
      const { dentistId, servicio } = await escenario();
      const { token } = await nuevoPaciente();

      const res = await reservar(token, { dentistId, serviceId: servicio.id, horaInicio });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
      expect(await prisma.appointment.count()).toBe(0);
    });

    it('responde 409 HORARIO_NO_DISPONIBLE sobre un bloque no disponible', async () => {
      const { dentistId, servicio } = await escenario();
      await prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date(LAS_NUEVE),
          fin: new Date('2026-11-10T14:00:00.000Z'),
        },
      });
      const { token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_NO_DISPONIBLE');
    });

    it('responde 409 HORARIO_EN_EL_PASADO si ya pasó', async () => {
      const { dentistId, servicio } = await escenario();
      const { token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: '2026-11-03T13:00:00.000Z',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('HORARIO_EN_EL_PASADO');
    });

    it('responde 409 si el servicio está deshabilitado', async () => {
      const { dentistId, servicio } = await escenario();
      await prisma.service.update({ where: { id: servicio.id }, data: { activo: false } });
      const { token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SERVICIO_DESHABILITADO');
    });

    it('responde 409 si el odontólogo no acepta citas', async () => {
      const { dentistId, servicio } = await escenario();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });
      const { token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ODONTOLOGO_DESHABILITADO');
    });

    it('responde 409 si el odontólogo no realiza el servicio', async () => {
      const { dentistId } = await escenario();
      const otro = await crearServicio(prisma);
      const { token } = await nuevoPaciente();

      const res = await reservar(token, { dentistId, serviceId: otro.id, horaInicio: LAS_NUEVE });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ODONTOLOGO_NO_REALIZA_SERVICIO');
    });

    it('responde 404 si el odontólogo o el servicio no existen', async () => {
      const { dentistId, servicio } = await escenario();
      const { token } = await nuevoPaciente();

      const sinOdontologo = await reservar(token, {
        dentistId: ID_INEXISTENTE,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      });
      const sinServicio = await reservar(token, {
        dentistId,
        serviceId: ID_INEXISTENTE,
        horaInicio: LAS_NUEVE,
      });

      expect(sinOdontologo.status).toBe(404);
      expect(sinServicio.status).toBe(404);
    });

    it.each([
      ['horaFin', { horaFin: LAS_NUEVE }],
      ['estado', { estado: 'CONFIRMADA' }],
      ['patientId', { patientId: ID_INEXISTENTE }],
    ])('rechaza con 400 que el cliente envíe %s', async (_campo, extra) => {
      const { dentistId, servicio } = await escenario();
      const { token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
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
    ])('responde 400 %s', async (_caso, cambios) => {
      const { dentistId, servicio } = await escenario();
      const { token } = await nuevoPaciente();

      const res = await reservar(token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
        ...cambios,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('constraint de exclusión', () => {
    it('el repository traduce appointment_no_overlap a HorarioNoDisponibleError', async () => {
      const { dentistId, servicio } = await escenario();
      const { paciente } = await nuevoPaciente();
      const datos = {
        dentistId,
        serviceId: servicio.id,
        patientId: paciente.patient!.id,
        horaInicio: new Date(LAS_NUEVE),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
      };
      await crearCita(prisma, {
        dentistId,
        horaInicio: datos.horaInicio,
        horaFin: datos.horaFin,
      });
      const repository = app.get(AppointmentsRepository);

      const intento = repository.withDentistLock(dentistId, (tx) => repository.create(tx, datos));

      await expect(intento).rejects.toThrow(HorarioNoDisponibleError);
    });
  });

  describe('GET /appointments/mine', () => {
    const citaDePaciente = async (
      patientId: string,
      dentistId: string,
      serviceId: string,
      horaInicio: string,
      horaFin: string,
      estado: 'PENDIENTE' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA' = 'PENDIENTE',
    ) =>
      prisma.appointment.create({
        data: {
          patientId,
          dentistId,
          serviceId,
          horaInicio: new Date(horaInicio),
          horaFin: new Date(horaFin),
          estado,
        },
      });

    it('responde 401 sin token', async () => {
      const res = await http().get(ruta('/appointments/mine'));

      expect(res.status).toBe(401);
    });

    it.each([
      ['ODONTOLOGO', crearOdontologo],
      ['ADMIN', crearAdmin],
    ])('responde 403 con el rol %s', async (_rol, crear) => {
      const token = await loginComo(app, await crear(prisma));

      const res = await conToken(http().get(ruta('/appointments/mine')), token);

      expect(res.status).toBe(403);
    });

    it('un paciente solo ve sus propias citas', async () => {
      const { dentistId, servicio } = await escenario();
      const uno = await nuevoPaciente();
      const dos = await nuevoPaciente();
      const mia = await citaDePaciente(
        uno.paciente.patient!.id,
        dentistId,
        servicio.id,
        LAS_NUEVE,
        '2026-11-10T13:30:00.000Z',
      );
      await citaDePaciente(
        dos.paciente.patient!.id,
        dentistId,
        servicio.id,
        '2026-11-10T14:00:00.000Z',
        '2026-11-10T14:30:00.000Z',
      );

      const res = await conToken(http().get(ruta('/appointments/mine')), uno.token);

      expect(res.status).toBe(200);
      expect((res.body as { id: string }[]).map((c) => c.id)).toEqual([mia.id]);
    });

    it('separa próximas e historial, cada una en su orden', async () => {
      const { dentistId, servicio } = await escenario();
      const { paciente, token } = await nuevoPaciente();
      const patientId = paciente.patient!.id;
      const crear = (inicio: string, fin: string, estado?: 'FINALIZADA' | 'CANCELADA') =>
        citaDePaciente(patientId, dentistId, servicio.id, inicio, fin, estado);
      const lejana = await crear('2026-11-12T13:00:00.000Z', '2026-11-12T13:30:00.000Z');
      const cercana = await crear('2026-11-10T13:00:00.000Z', '2026-11-10T13:30:00.000Z');
      const pasada = await crear(
        '2026-11-02T13:00:00.000Z',
        '2026-11-02T13:30:00.000Z',
        'FINALIZADA',
      );
      const cancelada = await crear(
        '2026-11-11T13:00:00.000Z',
        '2026-11-11T13:30:00.000Z',
        'CANCELADA',
      );

      const proximas = await conToken(
        http().get(ruta('/appointments/mine')).query({ cuando: 'proximas' }),
        token,
      );
      const historial = await conToken(
        http().get(ruta('/appointments/mine')).query({ cuando: 'historial' }),
        token,
      );

      expect((proximas.body as { id: string }[]).map((c) => c.id)).toEqual([cercana.id, lejana.id]);
      expect((historial.body as { id: string }[]).map((c) => c.id)).toEqual([
        cancelada.id,
        pasada.id,
      ]);
    });

    it('responde 400 con un valor de cuando desconocido', async () => {
      const { token } = await nuevoPaciente();

      const res = await conToken(
        http().get(ruta('/appointments/mine')).query({ cuando: 'ayer' }),
        token,
      );

      expect(res.status).toBe(400);
    });
  });

  describe('GET /appointments/:id', () => {
    async function citaReservada() {
      const { dentistId, servicio, odontologo } = await escenario();
      const dueno = await nuevoPaciente();
      const res = await reservar(dueno.token, {
        dentistId,
        serviceId: servicio.id,
        horaInicio: LAS_NUEVE,
      }).expect(201);
      return { citaId: res.body.id as string, dueno, odontologo };
    }

    it('responde 401 sin token', async () => {
      const res = await http().get(ruta(`/appointments/${ID_INEXISTENTE}`));

      expect(res.status).toBe(401);
    });

    it('la entrega al paciente dueño', async () => {
      const { citaId, dueno } = await citaReservada();

      const res = await conToken(http().get(ruta(`/appointments/${citaId}`)), dueno.token);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(citaId);
    });

    it('la entrega al odontólogo asignado', async () => {
      const { citaId, odontologo } = await citaReservada();
      const token = await loginComo(app, odontologo);

      const res = await conToken(http().get(ruta(`/appointments/${citaId}`)), token);

      expect(res.status).toBe(200);
    });

    it('la entrega al ADMIN', async () => {
      const { citaId } = await citaReservada();
      const token = await loginComo(app, await crearAdmin(prisma));

      const res = await conToken(http().get(ruta(`/appointments/${citaId}`)), token);

      expect(res.status).toBe(200);
    });

    it('responde 403 a otro paciente, sin revelar datos de la cita', async () => {
      const { citaId } = await citaReservada();
      const { token } = await nuevoPaciente();

      const res = await conToken(http().get(ruta(`/appointments/${citaId}`)), token);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      expect(res.body).not.toHaveProperty('horaInicio');
      expect(res.body).not.toHaveProperty('paciente');
    });

    it('responde 403 a otro odontólogo', async () => {
      const { citaId } = await citaReservada();
      const token = await loginComo(app, await crearOdontologo(prisma));

      const res = await conToken(http().get(ruta(`/appointments/${citaId}`)), token);

      expect(res.status).toBe(403);
    });

    it('responde 404 si la cita no existe', async () => {
      const { token } = await nuevoPaciente();

      const res = await conToken(http().get(ruta(`/appointments/${ID_INEXISTENTE}`)), token);

      expect(res.status).toBe(404);
    });

    it('responde 400 con un id mal formado', async () => {
      const { token } = await nuevoPaciente();

      const res = await conToken(http().get(ruta('/appointments/no-es-uuid')), token);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /appointments', () => {
    const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));
    const ids = (body: unknown) => (body as { id: string }[]).map((c) => c.id);

    it('responde 401 sin token', async () => {
      const res = await http().get(ruta('/appointments'));

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', crearPaciente],
      ['ODONTOLOGO', crearOdontologo],
    ])('responde 403 con el rol %s', async (_rol, crear) => {
      const token = await loginComo(app, await crear(prisma));

      const res = await conToken(http().get(ruta('/appointments')), token);

      expect(res.status).toBe(403);
    });

    it('devuelve todas las citas, de la más reciente a la más antigua', async () => {
      const uno = await escenario();
      const dos = await escenario();
      const vieja = await crearCita(prisma, {
        dentistId: uno.dentistId,
        horaInicio: new Date('2026-11-10T13:00:00.000Z'),
        horaFin: new Date('2026-11-10T13:30:00.000Z'),
      });
      const nueva = await crearCita(prisma, {
        dentistId: dos.dentistId,
        horaInicio: new Date('2026-11-11T13:00:00.000Z'),
        horaFin: new Date('2026-11-11T13:30:00.000Z'),
      });
      const token = await tokenDeAdmin();

      const res = await conToken(http().get(ruta('/appointments')), token);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([nueva.id, vieja.id]);
    });

    it('filtra por fecha en la zona de la clínica, estado y odontólogo', async () => {
      const uno = await escenario();
      const dos = await escenario();
      // El martes a las 23:00 en La Paz ya es miércoles en UTC.
      const nocturna = await crearCita(prisma, {
        dentistId: uno.dentistId,
        horaInicio: new Date('2026-11-11T03:00:00.000Z'),
        horaFin: new Date('2026-11-11T03:30:00.000Z'),
      });
      const confirmada = await crearCita(prisma, {
        dentistId: dos.dentistId,
        horaInicio: new Date('2026-11-12T13:00:00.000Z'),
        horaFin: new Date('2026-11-12T13:30:00.000Z'),
        estado: 'CONFIRMADA',
      });
      const token = await tokenDeAdmin();
      const consultar = (query: object) =>
        conToken(http().get(ruta('/appointments')).query(query), token);

      const porFecha = await consultar({ fecha: '2026-11-10' });
      const porEstado = await consultar({ estado: 'CONFIRMADA' });
      const porOdontologo = await consultar({ dentistId: uno.dentistId });

      expect(ids(porFecha.body)).toEqual([nocturna.id]);
      expect(ids(porEstado.body)).toEqual([confirmada.id]);
      expect(ids(porOdontologo.body)).toEqual([nocturna.id]);
    });

    it('pagina con limit y offset', async () => {
      const { dentistId } = await escenario();
      const primera = await crearCita(prisma, {
        dentistId,
        horaInicio: new Date('2026-11-12T13:00:00.000Z'),
        horaFin: new Date('2026-11-12T13:30:00.000Z'),
      });
      const segunda = await crearCita(prisma, {
        dentistId,
        horaInicio: new Date('2026-11-11T13:00:00.000Z'),
        horaFin: new Date('2026-11-11T13:30:00.000Z'),
      });
      const token = await tokenDeAdmin();

      const pagina1 = await conToken(http().get(ruta('/appointments')).query({ limit: 1 }), token);
      const pagina2 = await conToken(
        http().get(ruta('/appointments')).query({ limit: 1, offset: 1 }),
        token,
      );

      expect(ids(pagina1.body)).toEqual([primera.id]);
      expect(ids(pagina2.body)).toEqual([segunda.id]);
    });

    it.each([
      ['limit mayor que 100', { limit: 101 }],
      ['limit cero', { limit: 0 }],
      ['offset negativo', { offset: -1 }],
      ['estado desconocido', { estado: 'PERDIDA' }],
      ['dentistId mal formado', { dentistId: 'x' }],
      ['fecha que no existe', { fecha: '2026-02-30' }],
    ])('responde 400 con %s', async (_caso, query) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().get(ruta('/appointments')).query(query), token);

      expect(res.status).toBe(400);
    });
  });
});
