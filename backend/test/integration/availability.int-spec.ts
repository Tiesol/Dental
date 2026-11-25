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

describe('Disponibilidad (integración)', () => {
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
  const adminToken = async () => loginAs(app, await createAdmin(prisma));
  const patientToken = async () => loginAs(app, await createPatient(prisma));
  const dentistToken = async () => loginAs(app, await createDentist(prisma));
  const newDentistId = async () => (await createDentist(prisma)).dentist!.id;

  const timeRange = (weekday: number, startMinute: number, endMinute: number) => ({
    diaSemana: weekday,
    minutoInicio: startMinute,
    minutoFin: endMinute,
  });

  const scheduleInDb = (dentistId: string) =>
    prisma.availabilityRule.findMany({
      where: { dentistId },
      select: { diaSemana: true, minutoInicio: true, minutoFin: true },
      orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }],
    });

  describe('GET /dentists/:id/availability', () => {
    it('responde 401 sin token', async () => {
      const dentistId = await newDentistId();

      const res = await http().get(apiPath(`/dentists/${dentistId}/availability`));

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', patientToken],
      ['ODONTOLOGO', dentistToken],
      ['ADMIN', adminToken],
    ])('permite consultarla a cualquier rol autenticado: %s', async (_role, getToken) => {
      const dentistId = await newDentistId();
      const token = await getToken();

      const res = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ horarios: [], bloques: [] });
    });

    it('devuelve los horarios ordenados por día y hora', async () => {
      const dentistId = await newDentistId();
      await prisma.availabilityRule.createMany({
        data: [
          { dentistId, ...timeRange(2, 540, 720) },
          { dentistId, ...timeRange(1, 840, 1080) },
          { dentistId, ...timeRange(1, 480, 720) },
        ],
      });
      const token = await patientToken();

      const res = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );

      expect(res.status).toBe(200);
      expect(res.body.horarios).toEqual([
        { id: expect.any(String), ...timeRange(1, 480, 720) },
        { id: expect.any(String), ...timeRange(1, 840, 1080) },
        { id: expect.any(String), ...timeRange(2, 540, 720) },
      ]);
    });

    it('devuelve solo los bloques que aún no terminan, ordenados por inicio', async () => {
      const dentistId = await newDentistId();
      const block = (start: string, end: string, reason?: string) => ({
        dentistId,
        inicio: new Date(start),
        fin: new Date(end),
        motivo: reason,
      });
      await prisma.unavailableBlock.createMany({
        data: [
          block('2026-11-12T14:00:00.000Z', '2026-11-12T15:00:00.000Z', 'Congreso'),
          block('2026-11-08T14:00:00.000Z', '2026-11-08T15:00:00.000Z', 'Ya terminó'),
          block('2026-11-09T13:00:00.000Z', '2026-11-09T14:00:00.000Z', 'Termina justo ahora'),
          block('2026-11-09T13:30:00.000Z', '2026-11-09T14:30:00.000Z'),
        ],
      });
      const token = await adminToken();

      const res = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );

      expect(res.body.bloques).toEqual([
        {
          id: expect.any(String),
          inicio: '2026-11-09T13:30:00.000Z',
          fin: '2026-11-09T14:30:00.000Z',
          motivo: null,
        },
        {
          id: expect.any(String),
          inicio: '2026-11-12T14:00:00.000Z',
          fin: '2026-11-12T15:00:00.000Z',
          motivo: 'Congreso',
        },
      ]);
    });

    it.each([
      ['PACIENTE', patientToken],
      ['ODONTOLOGO', dentistToken],
    ])('oculta el motivo de los bloques al rol %s', async (_role, getToken) => {
      const dentistId = await newDentistId();
      await prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
          motivo: 'Cirugía personal',
        },
      });
      const token = await getToken();

      const res = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );

      expect(res.body.bloques).toEqual([
        {
          id: expect.any(String),
          inicio: '2026-11-12T14:00:00.000Z',
          fin: '2026-11-12T15:00:00.000Z',
        },
      ]);
    });

    it('no mezcla la disponibilidad de otro odontólogo', async () => {
      const dentistId = await newDentistId();
      const otherId = await newDentistId();
      await prisma.availabilityRule.create({
        data: { dentistId: otherId, ...timeRange(1, 540, 720) },
      });
      await prisma.unavailableBlock.create({
        data: {
          dentistId: otherId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
        },
      });
      const token = await patientToken();

      const res = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );

      expect(res.body).toEqual({ horarios: [], bloques: [] });
    });

    it('responde 404 si el odontólogo no existe', async () => {
      const token = await patientToken();

      const res = await withToken(
        http().get(apiPath(`/dentists/${MISSING_ID}/availability`)),
        token,
      );

      expect(res.status).toBe(404);
    });

    describe('odontólogo que no acepta citas', () => {
      const disableProfessional = async () => {
        const dentist = await createDentist(prisma);
        await prisma.dentist.update({
          where: { id: dentist.dentist!.id },
          data: { activo: false },
        });
        return dentist.dentist!.id;
      };
      const disableAccount = async () => {
        const dentist = await createDentist(prisma);
        await prisma.user.update({ where: { id: dentist.id }, data: { activo: false } });
        return dentist.dentist!.id;
      };

      it.each([
        ['profesional deshabilitado', disableProfessional],
        ['cuenta deshabilitada', disableAccount],
      ])('responde 404 a quien no es ADMIN: %s', async (_testCase, disable) => {
        const dentistId = await disable();
        const token = await patientToken();

        const res = await withToken(
          http().get(apiPath(`/dentists/${dentistId}/availability`)),
          token,
        );

        expect(res.status).toBe(404);
      });

      it('responde 200 al ADMIN', async () => {
        const dentistId = await disableProfessional();
        const token = await adminToken();

        const res = await withToken(
          http().get(apiPath(`/dentists/${dentistId}/availability`)),
          token,
        );

        expect(res.status).toBe(200);
      });
    });
  });

  describe('PUT /dentists/:id/availability', () => {
    const body = { horarios: [timeRange(1, 540, 720)] };

    it('responde 401 sin token', async () => {
      const dentistId = await newDentistId();

      const res = await http()
        .put(apiPath(`/dentists/${dentistId}/availability`))
        .send(body);

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', patientToken],
      ['ODONTOLOGO', dentistToken],
    ])('responde 403 con el rol %s y no guarda nada', async (_role, getToken) => {
      const dentistId = await newDentistId();
      const token = await getToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send(body);

      expect(res.status).toBe(403);
      expect(await scheduleInDb(dentistId)).toEqual([]);
    });

    it('configura la disponibilidad, la persiste y se recupera desde la API', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();
      const schedule = [timeRange(2, 540, 720), timeRange(1, 840, 1080), timeRange(1, 480, 720)];

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: schedule });

      const sorted = [
        { id: expect.any(String), ...timeRange(1, 480, 720) },
        { id: expect.any(String), ...timeRange(1, 840, 1080) },
        { id: expect.any(String), ...timeRange(2, 540, 720) },
      ];
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ horarios: sorted, bloques: [] });
      expect(await scheduleInDb(dentistId)).toEqual([
        timeRange(1, 480, 720),
        timeRange(1, 840, 1080),
        timeRange(2, 540, 720),
      ]);
      const consultation = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );
      expect(consultation.body).toEqual({ horarios: sorted, bloques: [] });
    });

    it('reemplaza todos los horarios anteriores', async () => {
      const dentistId = await newDentistId();
      await prisma.availabilityRule.createMany({
        data: [
          { dentistId, ...timeRange(1, 540, 720) },
          { dentistId, ...timeRange(3, 540, 720) },
        ],
      });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [timeRange(5, 600, 660)] });

      expect(res.status).toBe(200);
      expect(await scheduleInDb(dentistId)).toEqual([timeRange(5, 600, 660)]);
    });

    it('con una lista vacía deja al odontólogo sin horarios', async () => {
      const dentistId = await newDentistId();
      await prisma.availabilityRule.create({ data: { dentistId, ...timeRange(1, 540, 720) } });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [] });

      expect(res.status).toBe(200);
      expect(await scheduleInDb(dentistId)).toEqual([]);
    });

    it('no toca los horarios de otro odontólogo', async () => {
      const dentistId = await newDentistId();
      const otherId = await newDentistId();
      await prisma.availabilityRule.create({
        data: { dentistId: otherId, ...timeRange(1, 540, 720) },
      });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [timeRange(5, 600, 660)] });

      expect(res.status).toBe(200);
      expect(await scheduleInDb(dentistId)).toEqual([timeRange(5, 600, 660)]);
      expect(await scheduleInDb(otherId)).toEqual([timeRange(1, 540, 720)]);
    });

    it('acepta hasta 100 tramos', async () => {
      const dentistId = await newDentistId();
      const schedule = Array.from({ length: 100 }, (_, i) => timeRange(1, i, i + 1));
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: schedule });

      expect(res.status).toBe(200);
      expect(await scheduleInDb(dentistId)).toHaveLength(100);
    });

    it('conserva los bloques y los incluye en la respuesta', async () => {
      const dentistId = await newDentistId();
      await prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
        },
      });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send(body);

      expect(res.body.bloques).toEqual([
        {
          id: expect.any(String),
          inicio: '2026-11-12T14:00:00.000Z',
          fin: '2026-11-12T15:00:00.000Z',
          motivo: null,
        },
      ]);
    });

    it('permite cambiar el horario aunque deje citas fuera y las conserva (D6)', async () => {
      const dentistId = await newDentistId();
      const appointment = await createAppointment(prisma, {
        dentistId,
        horaInicio: new Date('2026-11-10T14:00:00.000Z'),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [timeRange(5, 600, 660)] });

      expect(res.status).toBe(200);
      const inDb = await prisma.appointment.findUnique({ where: { id: appointment.id } });
      expect(inDb).toMatchObject({ estado: 'PENDIENTE', horaInicio: appointment.horaInicio });
    });

    it('permite al ADMIN configurar a un odontólogo deshabilitado', async () => {
      const dentistId = await newDentistId();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send(body);

      expect(res.status).toBe(200);
    });

    it('responde 404 si el odontólogo no existe', async () => {
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${MISSING_ID}/availability`)),
        token,
      ).send(body);

      expect(res.status).toBe(404);
    });

    it.each([
      ['día fuera de rango', [timeRange(7, 540, 720)]],
      ['minutos fuera de rango', [timeRange(1, 540, 1441)]],
      ['inicio posterior al fin', [timeRange(1, 720, 540)]],
      ['tramos solapados', [timeRange(1, 540, 720), timeRange(1, 700, 900)]],
    ])('responde 400 HORARIO_INVALIDO y conserva lo anterior: %s', async (_testCase, schedule) => {
      const dentistId = await newDentistId();
      await prisma.availabilityRule.create({ data: { dentistId, ...timeRange(3, 540, 720) } });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: schedule });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('HORARIO_INVALIDO');
      expect(await scheduleInDb(dentistId)).toEqual([timeRange(3, 540, 720)]);
    });

    it.each([
      ['sin la lista de horarios', {}],
      ['horarios que no son una lista', { horarios: 'lunes' }],
      ['un horario que no es un objeto', { horarios: ['lunes'] }],
      ['un horario sin minutoFin', { horarios: [{ diaSemana: 1, minutoInicio: 540 }] }],
      ['un día como texto', { horarios: [{ ...timeRange(1, 540, 720), diaSemana: 'lunes' }] }],
      ['minutos con decimales', { horarios: [timeRange(1, 540.5, 720)] }],
      ['un campo extra en el horario', { horarios: [{ ...timeRange(1, 540, 720), id: 'x' }] }],
      ['listas anidadas', { horarios: [[timeRange(1, 540, 720)]] }],
      ['un campo extra en el cuerpo', { horarios: [], dentistId: 'x' }],
      // Sin solapar entre sí: lo único que los rechaza es el límite de la lista.
      [
        'más de 100 tramos',
        { horarios: Array.from({ length: 101 }, (_, i) => timeRange(1, i, i + 1)) },
      ],
    ])('responde 400 con un cuerpo mal formado: %s', async (_testCase, body) => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send(body);

      expect(res.status).toBe(400);
      expect(await scheduleInDb(dentistId)).toEqual([]);
    });

    it('explica en español que un horario no es un objeto', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: ['lunes'] });

      expect(res.status).toBe(400);
      // El prefijo "horarios." lo agrega ValidationPipe en las validaciones anidadas.
      expect(res.body.message).toEqual(['horarios.Cada horario debe ser un objeto']);
    });
  });

  describe('POST /dentists/:id/blocks', () => {
    const body = {
      inicio: '2026-11-10T14:00:00.000Z',
      fin: '2026-11-10T15:00:00.000Z',
      motivo: 'Congreso',
    };
    // Cita de 10:00 a 10:30 en La Paz, el día del bloque.
    const startsAt = new Date('2026-11-10T14:00:00.000Z');
    const endsAt = new Date('2026-11-10T14:30:00.000Z');

    const blocksInDb = (dentistId: string) =>
      prisma.unavailableBlock.count({ where: { dentistId } });

    it('responde 401 sin token', async () => {
      const dentistId = await newDentistId();

      const res = await http()
        .post(apiPath(`/dentists/${dentistId}/blocks`))
        .send(body);

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', patientToken],
      ['ODONTOLOGO', dentistToken],
    ])('responde 403 con el rol %s y no guarda nada', async (_role, getToken) => {
      const dentistId = await newDentistId();
      const token = await getToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(body);

      expect(res.status).toBe(403);
      expect(await blocksInDb(dentistId)).toBe(0);
    });

    it('crea el bloque, lo persiste y aparece en la disponibilidad', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(body);

      const created = { id: expect.any(String), ...body };
      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
      const inDb = await prisma.unavailableBlock.findUnique({ where: { id: res.body.id } });
      expect(inDb).toMatchObject({
        dentistId,
        inicio: new Date(body.inicio),
        fin: new Date(body.fin),
        motivo: 'Congreso',
      });
      const consultation = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );
      expect(consultation.body.bloques).toEqual([created]);
    });

    it('sin motivo lo guarda como null', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send({
        inicio: body.inicio,
        fin: body.fin,
      });

      expect(res.status).toBe(201);
      expect(res.body.motivo).toBeNull();
    });

    it('acepta fechas con otra zona horaria y las devuelve en UTC', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send({
        inicio: '2026-11-10T10:00:00-04:00',
        fin: '2026-11-10T11:00:00-04:00',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ inicio: body.inicio, fin: body.fin });
    });

    it('acepta fechas sin segundos', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send({
        inicio: '2026-11-10T14:00Z',
        fin: '2026-11-10T15:00Z',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ inicio: body.inicio, fin: body.fin });
    });

    it('acepta un motivo de 200 caracteres', async () => {
      const dentistId = await newDentistId();
      const reason = 'x'.repeat(200);
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send({
        ...body,
        motivo: reason,
      });

      expect(res.status).toBe(201);
      expect(res.body.motivo).toBe(reason);
    });

    it('permite al ADMIN bloquear a un odontólogo deshabilitado', async () => {
      const dentistId = await newDentistId();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(body);

      expect(res.status).toBe(201);
    });

    it('responde 404 si el odontólogo no existe', async () => {
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${MISSING_ID}/blocks`)),
        token,
      ).send(body);

      expect(res.status).toBe(404);
    });

    it.each([
      ['termina antes de empezar', '2026-11-10T15:00:00.000Z', '2026-11-10T14:00:00.000Z'],
      ['termina cuando empieza', '2026-11-10T14:00:00.000Z', '2026-11-10T14:00:00.000Z'],
      ['ya terminó', '2026-11-08T14:00:00.000Z', '2026-11-08T15:00:00.000Z'],
      ['termina justo ahora', '2026-11-09T13:00:00.000Z', '2026-11-09T14:00:00.000Z'],
    ])('responde 400 FECHA_INVALIDA si el bloque %s', async (_testCase, start, end) => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send({
        inicio: start,
        fin: end,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FECHA_INVALIDA');
      expect(await blocksInDb(dentistId)).toBe(0);
    });

    it.each([
      ['sin inicio', { fin: body.fin }],
      ['sin fin', { inicio: body.inicio }],
      ['una fecha que no existe', { ...body, inicio: '2026-02-30T14:00:00.000Z' }],
      ['un texto en vez de fecha', { ...body, fin: 'mañana' }],
      ['una fecha sin hora', { ...body, inicio: '2026-11-10' }],
      ['una fecha sin zona horaria', { ...body, inicio: '2026-11-10T14:00:00' }],
      ['una fecha en formato de semana', { ...body, inicio: '2026-W46-2T14:00:00Z' }],
      ['un número en vez de fecha', { ...body, inicio: 1794000000000 }],
      ['un motivo que no es texto', { ...body, motivo: 5 }],
      ['un motivo de más de 200 caracteres', { ...body, motivo: 'x'.repeat(201) }],
      ['un campo extra', { ...body, dentistId: 'x' }],
    ])('responde 400 con un cuerpo mal formado: %s', async (_testCase, body) => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(body);

      expect(res.status).toBe(400);
      expect(await blocksInDb(dentistId)).toBe(0);
    });

    it.each(['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA'] as const)(
      'responde 409 si choca con una cita %s y no guarda el bloque',
      async (status) => {
        const dentistId = await newDentistId();
        await createAppointment(prisma, {
          dentistId,
          horaInicio: startsAt,
          horaFin: endsAt,
          estado: status,
        });
        const token = await adminToken();

        const res = await withToken(
          http().post(apiPath(`/dentists/${dentistId}/blocks`)),
          token,
        ).send(body);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('BLOQUE_CON_CITAS');
        expect(await blocksInDb(dentistId)).toBe(0);
      },
    );

    it.each([
      ['la cita empieza antes y termina dentro', '2026-11-10T13:45:00Z', '2026-11-10T14:15:00Z'],
      ['la cita empieza dentro y termina después', '2026-11-10T14:45:00Z', '2026-11-10T15:15:00Z'],
      ['el bloque está contenido en la cita', '2026-11-10T13:00:00Z', '2026-11-10T16:00:00Z'],
    ])(
      'responde 409 con un solapamiento parcial: %s',
      async (_testCase, appointmentStart, appointmentEnd) => {
        const dentistId = await newDentistId();
        await createAppointment(prisma, {
          dentistId,
          horaInicio: new Date(appointmentStart),
          horaFin: new Date(appointmentEnd),
        });
        const token = await adminToken();

        const res = await withToken(
          http().post(apiPath(`/dentists/${dentistId}/blocks`)),
          token,
        ).send(body);

        expect(res.status).toBe(409);
      },
    );

    it('permite el bloque sobre una cita CANCELADA, que no ocupa el horario', async () => {
      const dentistId = await newDentistId();
      await createAppointment(prisma, {
        dentistId,
        horaInicio: startsAt,
        horaFin: endsAt,
        estado: 'CANCELADA',
      });
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(body);

      expect(res.status).toBe(201);
    });

    it.each([
      ['termina cuando empieza el bloque', '2026-11-10T13:30:00Z', '2026-11-10T14:00:00Z'],
      ['empieza cuando termina el bloque', '2026-11-10T15:00:00Z', '2026-11-10T15:30:00Z'],
    ])(
      'permite el bloque consecutivo a una cita que %s',
      async (_testCase, appointmentStart, appointmentEnd) => {
        const dentistId = await newDentistId();
        await createAppointment(prisma, {
          dentistId,
          horaInicio: new Date(appointmentStart),
          horaFin: new Date(appointmentEnd),
        });
        const token = await adminToken();

        const res = await withToken(
          http().post(apiPath(`/dentists/${dentistId}/blocks`)),
          token,
        ).send(body);

        expect(res.status).toBe(201);
      },
    );

    it('permite el bloque en el horario de una cita de otro odontólogo', async () => {
      const dentistId = await newDentistId();
      const otherId = await newDentistId();
      await createAppointment(prisma, {
        dentistId: otherId,
        horaInicio: startsAt,
        horaFin: endsAt,
      });
      const token = await adminToken();

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(body);

      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /dentists/:id/blocks/:blockId', () => {
    const createBlock = (dentistId: string) =>
      prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
        },
      });
    const exists = async (blockId: string) =>
      (await prisma.unavailableBlock.count({ where: { id: blockId } })) === 1;

    it('responde 401 sin token y conserva el bloque', async () => {
      const dentistId = await newDentistId();
      const block = await createBlock(dentistId);

      const res = await http().delete(apiPath(`/dentists/${dentistId}/blocks/${block.id}`));

      expect(res.status).toBe(401);
      expect(await exists(block.id)).toBe(true);
    });

    it.each([
      ['PACIENTE', patientToken],
      ['ODONTOLOGO', dentistToken],
    ])('responde 403 con el rol %s y conserva el bloque', async (_role, getToken) => {
      const dentistId = await newDentistId();
      const block = await createBlock(dentistId);
      const token = await getToken();

      const res = await withToken(
        http().delete(apiPath(`/dentists/${dentistId}/blocks/${block.id}`)),
        token,
      );

      expect(res.status).toBe(403);
      expect(await exists(block.id)).toBe(true);
    });

    it('borra el bloque y deja de aparecer en la disponibilidad', async () => {
      const dentistId = await newDentistId();
      const block = await createBlock(dentistId);
      const token = await adminToken();

      const res = await withToken(
        http().delete(apiPath(`/dentists/${dentistId}/blocks/${block.id}`)),
        token,
      );

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(await exists(block.id)).toBe(false);
      const consultation = await withToken(
        http().get(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      );
      expect(consultation.body.bloques).toEqual([]);
    });

    it('responde 404 con un bloque de otro odontólogo y no lo borra', async () => {
      const dentistId = await newDentistId();
      const otherId = await newDentistId();
      const other = await createBlock(otherId);
      const token = await adminToken();

      const res = await withToken(
        http().delete(apiPath(`/dentists/${dentistId}/blocks/${other.id}`)),
        token,
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('RECURSO_NO_ENCONTRADO');
      expect(await exists(other.id)).toBe(true);
    });

    it('permite al ADMIN borrar un bloque de un odontólogo deshabilitado', async () => {
      const dentistId = await newDentistId();
      const block = await createBlock(dentistId);
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });
      const token = await adminToken();

      const res = await withToken(
        http().delete(apiPath(`/dentists/${dentistId}/blocks/${block.id}`)),
        token,
      );

      expect(res.status).toBe(204);
      expect(await exists(block.id)).toBe(false);
    });

    it('responde 404 si el bloque no existe', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(
        http().delete(apiPath(`/dentists/${dentistId}/blocks/${MISSING_ID}`)),
        token,
      );

      expect(res.status).toBe(404);
    });

    it('responde 404 si el odontólogo no existe y no borra el bloque', async () => {
      const dentistId = await newDentistId();
      const block = await createBlock(dentistId);
      const token = await adminToken();

      const res = await withToken(
        http().delete(apiPath(`/dentists/${MISSING_ID}/blocks/${block.id}`)),
        token,
      );

      expect(res.status).toBe(404);
      expect(await exists(block.id)).toBe(true);
    });
  });

  describe('el odontólogo dueño de la agenda', () => {
    const block = { inicio: '2026-11-12T14:00:00.000Z', fin: '2026-11-12T15:00:00.000Z' };

    it('no puede cambiar sus propios horarios', async () => {
      const dentist = await createDentist(prisma);
      const dentistId = dentist.dentist!.id;
      const token = await loginAs(app, dentist);

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [timeRange(1, 540, 720)] });

      expect(res.status).toBe(403);
      expect(await scheduleInDb(dentistId)).toEqual([]);
    });

    it('no puede crear sus propios bloques', async () => {
      const dentist = await createDentist(prisma);
      const dentistId = dentist.dentist!.id;
      const token = await loginAs(app, dentist);

      const res = await withToken(
        http().post(apiPath(`/dentists/${dentistId}/blocks`)),
        token,
      ).send(block);

      expect(res.status).toBe(403);
      expect(await prisma.unavailableBlock.count({ where: { dentistId } })).toBe(0);
    });

    it('no puede borrar sus propios bloques', async () => {
      const dentist = await createDentist(prisma);
      const dentistId = dentist.dentist!.id;
      const created = await prisma.unavailableBlock.create({
        data: { dentistId, inicio: new Date(block.inicio), fin: new Date(block.fin) },
      });
      const token = await loginAs(app, dentist);

      const res = await withToken(
        http().delete(apiPath(`/dentists/${dentistId}/blocks/${created.id}`)),
        token,
      );

      expect(res.status).toBe(403);
      expect(await prisma.unavailableBlock.count({ where: { id: created.id } })).toBe(1);
    });
  });

  describe('ids mal formados', () => {
    // Los cuerpos son válidos: lo único que puede dar 400 es el id.
    const block = { inicio: '2026-11-12T14:00:00.000Z', fin: '2026-11-12T15:00:00.000Z' };

    it.each([
      ['GET availability', 'get', '/dentists/no-es-uuid/availability', undefined],
      ['PUT availability', 'put', '/dentists/no-es-uuid/availability', { horarios: [] }],
      ['POST blocks', 'post', '/dentists/no-es-uuid/blocks', block],
      [
        'DELETE blocks, odontólogo',
        'delete',
        `/dentists/no-es-uuid/blocks/${MISSING_ID}`,
        undefined,
      ],
      ['DELETE blocks, bloque', 'delete', `/dentists/${MISSING_ID}/blocks/no-es-uuid`, undefined],
    ] as const)('responde 400 en %s', async (_testCase, method, path, body) => {
      const token = await adminToken();

      const res = await withToken(http()[method](apiPath(path)), token).send(body);

      expect(res.status).toBe(400);
    });
  });

  describe('concurrencia', () => {
    it('un bloque espera a la reserva en curso y responde 409 si esa cita choca con él', async () => {
      const dentistId = await newDentistId();
      const patient = await createPatient(prisma);
      const service = await createService(prisma);
      const token = await adminToken();
      let response!: Promise<request.Response>;

      // Reproduce una reserva en curso: tiene al odontólogo bloqueado y su cita aún no se ve.
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Dentist" WHERE id = ${dentistId} FOR UPDATE`;
        response = withToken(http().post(apiPath(`/dentists/${dentistId}/blocks`)), token)
          .send({ inicio: '2026-11-10T14:00:00.000Z', fin: '2026-11-10T15:00:00.000Z' })
          .then((res) => res); // supertest envía la petición recién al llamar a then.
        await new Promise((resolve) => setTimeout(resolve, 300));
        await tx.appointment.create({
          data: {
            dentistId,
            patientId: patient.patient!.id,
            serviceId: service.id,
            horaInicio: new Date('2026-11-10T14:00:00.000Z'),
            horaFin: new Date('2026-11-10T14:30:00.000Z'),
          },
        });
      });

      const res = await response;
      expect(res.status).toBe(409);
      expect(await prisma.unavailableBlock.count({ where: { dentistId } })).toBe(0);
    });

    it('varios reemplazos simultáneos terminan bien y queda uno de ellos completo', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();
      const replace = (schedule: ReturnType<typeof timeRange>[]) =>
        withToken(http().put(apiPath(`/dentists/${dentistId}/availability`)), token).send({
          horarios: schedule,
        });
      // Cada conjunto se solapa con los demás: mezclados violarían availability_no_overlap.
      const sets = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [
        timeRange(1, 540 + i, 720),
        timeRange(2, 540 + i, 720),
      ]);

      const responses = await Promise.all(sets.map(replace));

      expect(responses.map((res) => res.status)).toEqual(sets.map(() => 200));
      expect(sets).toContainEqual(await scheduleInDb(dentistId));
    });
  });
});
