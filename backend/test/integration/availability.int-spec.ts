import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearCita, crearOdontologo, crearPaciente } from '../helpers/factories';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('Disponibilidad (integración)', () => {
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
  const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));
  const tokenDePaciente = async () => loginComo(app, await crearPaciente(prisma));
  const tokenDeOdontologo = async () => loginComo(app, await crearOdontologo(prisma));
  const nuevoOdontologoId = async () => (await crearOdontologo(prisma)).dentist!.id;

  const tramo = (diaSemana: number, minutoInicio: number, minutoFin: number) => ({
    diaSemana,
    minutoInicio,
    minutoFin,
  });

  const horariosEnBd = (dentistId: string) =>
    prisma.availabilityRule.findMany({
      where: { dentistId },
      select: { diaSemana: true, minutoInicio: true, minutoFin: true },
      orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }],
    });

  describe('GET /dentists/:id/availability', () => {
    it('responde 401 sin token', async () => {
      const dentistId = await nuevoOdontologoId();

      const res = await http().get(ruta(`/dentists/${dentistId}/availability`));

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', tokenDePaciente],
      ['ODONTOLOGO', tokenDeOdontologo],
      ['ADMIN', tokenDeAdmin],
    ])('permite consultarla a cualquier rol autenticado: %s', async (_rol, obtenerToken) => {
      const dentistId = await nuevoOdontologoId();
      const token = await obtenerToken();

      const res = await conToken(http().get(ruta(`/dentists/${dentistId}/availability`)), token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ horarios: [], bloques: [] });
    });

    it('devuelve los horarios ordenados por día y hora', async () => {
      const dentistId = await nuevoOdontologoId();
      await prisma.availabilityRule.createMany({
        data: [
          { dentistId, ...tramo(2, 540, 720) },
          { dentistId, ...tramo(1, 840, 1080) },
          { dentistId, ...tramo(1, 480, 720) },
        ],
      });
      const token = await tokenDePaciente();

      const res = await conToken(http().get(ruta(`/dentists/${dentistId}/availability`)), token);

      expect(res.status).toBe(200);
      expect(res.body.horarios).toEqual([
        { id: expect.any(String), ...tramo(1, 480, 720) },
        { id: expect.any(String), ...tramo(1, 840, 1080) },
        { id: expect.any(String), ...tramo(2, 540, 720) },
      ]);
    });

    it('devuelve solo los bloques que aún no terminan, ordenados por inicio', async () => {
      const dentistId = await nuevoOdontologoId();
      const bloque = (inicio: string, fin: string, motivo?: string) => ({
        dentistId,
        inicio: new Date(inicio),
        fin: new Date(fin),
        motivo,
      });
      await prisma.unavailableBlock.createMany({
        data: [
          bloque('2026-11-12T14:00:00.000Z', '2026-11-12T15:00:00.000Z', 'Congreso'),
          bloque('2026-11-08T14:00:00.000Z', '2026-11-08T15:00:00.000Z', 'Ya terminó'),
          bloque('2026-11-09T13:00:00.000Z', '2026-11-09T14:00:00.000Z', 'Termina justo ahora'),
          bloque('2026-11-09T13:30:00.000Z', '2026-11-09T14:30:00.000Z'),
        ],
      });
      const token = await tokenDePaciente();

      const res = await conToken(http().get(ruta(`/dentists/${dentistId}/availability`)), token);

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

    it('no mezcla la disponibilidad de otro odontólogo', async () => {
      const dentistId = await nuevoOdontologoId();
      const otroId = await nuevoOdontologoId();
      await prisma.availabilityRule.create({ data: { dentistId: otroId, ...tramo(1, 540, 720) } });
      await prisma.unavailableBlock.create({
        data: {
          dentistId: otroId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
        },
      });
      const token = await tokenDePaciente();

      const res = await conToken(http().get(ruta(`/dentists/${dentistId}/availability`)), token);

      expect(res.body).toEqual({ horarios: [], bloques: [] });
    });

    it('responde 404 si el odontólogo no existe', async () => {
      const token = await tokenDePaciente();

      const res = await conToken(
        http().get(ruta(`/dentists/${ID_INEXISTENTE}/availability`)),
        token,
      );

      expect(res.status).toBe(404);
    });

    describe('odontólogo que no acepta citas', () => {
      const deshabilitarProfesional = async () => {
        const odontologo = await crearOdontologo(prisma);
        await prisma.dentist.update({
          where: { id: odontologo.dentist!.id },
          data: { activo: false },
        });
        return odontologo.dentist!.id;
      };
      const deshabilitarCuenta = async () => {
        const odontologo = await crearOdontologo(prisma);
        await prisma.user.update({ where: { id: odontologo.id }, data: { activo: false } });
        return odontologo.dentist!.id;
      };

      it.each([
        ['profesional deshabilitado', deshabilitarProfesional],
        ['cuenta deshabilitada', deshabilitarCuenta],
      ])('responde 404 a quien no es ADMIN: %s', async (_caso, deshabilitar) => {
        const dentistId = await deshabilitar();
        const token = await tokenDePaciente();

        const res = await conToken(http().get(ruta(`/dentists/${dentistId}/availability`)), token);

        expect(res.status).toBe(404);
      });

      it('responde 200 al ADMIN', async () => {
        const dentistId = await deshabilitarProfesional();
        const token = await tokenDeAdmin();

        const res = await conToken(http().get(ruta(`/dentists/${dentistId}/availability`)), token);

        expect(res.status).toBe(200);
      });
    });
  });

  describe('PUT /dentists/:id/availability', () => {
    const cuerpo = { horarios: [tramo(1, 540, 720)] };

    it('responde 401 sin token', async () => {
      const dentistId = await nuevoOdontologoId();

      const res = await http()
        .put(ruta(`/dentists/${dentistId}/availability`))
        .send(cuerpo);

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', tokenDePaciente],
      ['ODONTOLOGO', tokenDeOdontologo],
    ])('responde 403 con el rol %s y no guarda nada', async (_rol, obtenerToken) => {
      const dentistId = await nuevoOdontologoId();
      const token = await obtenerToken();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send(cuerpo);

      expect(res.status).toBe(403);
      expect(await horariosEnBd(dentistId)).toEqual([]);
    });

    it('configura la disponibilidad, la persiste y se recupera desde la API', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();
      const horarios = [tramo(2, 540, 720), tramo(1, 840, 1080), tramo(1, 480, 720)];

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios });

      const ordenados = [
        { id: expect.any(String), ...tramo(1, 480, 720) },
        { id: expect.any(String), ...tramo(1, 840, 1080) },
        { id: expect.any(String), ...tramo(2, 540, 720) },
      ];
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ horarios: ordenados, bloques: [] });
      expect(await horariosEnBd(dentistId)).toEqual([
        tramo(1, 480, 720),
        tramo(1, 840, 1080),
        tramo(2, 540, 720),
      ]);
      const consulta = await conToken(
        http().get(ruta(`/dentists/${dentistId}/availability`)),
        token,
      );
      expect(consulta.body).toEqual({ horarios: ordenados, bloques: [] });
    });

    it('reemplaza todos los horarios anteriores', async () => {
      const dentistId = await nuevoOdontologoId();
      await prisma.availabilityRule.createMany({
        data: [
          { dentistId, ...tramo(1, 540, 720) },
          { dentistId, ...tramo(3, 540, 720) },
        ],
      });
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [tramo(5, 600, 660)] });

      expect(res.status).toBe(200);
      expect(await horariosEnBd(dentistId)).toEqual([tramo(5, 600, 660)]);
    });

    it('con una lista vacía deja al odontólogo sin horarios', async () => {
      const dentistId = await nuevoOdontologoId();
      await prisma.availabilityRule.create({ data: { dentistId, ...tramo(1, 540, 720) } });
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [] });

      expect(res.status).toBe(200);
      expect(await horariosEnBd(dentistId)).toEqual([]);
    });

    it('no toca los horarios de otro odontólogo', async () => {
      const dentistId = await nuevoOdontologoId();
      const otroId = await nuevoOdontologoId();
      await prisma.availabilityRule.create({ data: { dentistId: otroId, ...tramo(1, 540, 720) } });
      const token = await tokenDeAdmin();

      await conToken(http().put(ruta(`/dentists/${dentistId}/availability`)), token).send(cuerpo);

      expect(await horariosEnBd(otroId)).toEqual([tramo(1, 540, 720)]);
    });

    it('conserva los bloques y los incluye en la respuesta', async () => {
      const dentistId = await nuevoOdontologoId();
      await prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
        },
      });
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send(cuerpo);

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
      const dentistId = await nuevoOdontologoId();
      const cita = await crearCita(prisma, {
        dentistId,
        horaInicio: new Date('2026-11-10T14:00:00.000Z'),
        horaFin: new Date('2026-11-10T14:30:00.000Z'),
      });
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios: [tramo(5, 600, 660)] });

      expect(res.status).toBe(200);
      const enBd = await prisma.appointment.findUnique({ where: { id: cita.id } });
      expect(enBd).toMatchObject({ estado: 'PENDIENTE', horaInicio: cita.horaInicio });
    });

    it('permite al ADMIN configurar a un odontólogo deshabilitado', async () => {
      const dentistId = await nuevoOdontologoId();
      await prisma.dentist.update({ where: { id: dentistId }, data: { activo: false } });
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send(cuerpo);

      expect(res.status).toBe(200);
    });

    it('responde 404 si el odontólogo no existe', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${ID_INEXISTENTE}/availability`)),
        token,
      ).send(cuerpo);

      expect(res.status).toBe(404);
    });

    it.each([
      ['día fuera de rango', [tramo(7, 540, 720)]],
      ['minutos fuera de rango', [tramo(1, 540, 1441)]],
      ['inicio posterior al fin', [tramo(1, 720, 540)]],
      ['tramos solapados', [tramo(1, 540, 720), tramo(1, 700, 900)]],
    ])('responde 400 HORARIO_INVALIDO y conserva lo anterior: %s', async (_caso, horarios) => {
      const dentistId = await nuevoOdontologoId();
      await prisma.availabilityRule.create({ data: { dentistId, ...tramo(3, 540, 720) } });
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send({ horarios });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('HORARIO_INVALIDO');
      expect(await horariosEnBd(dentistId)).toEqual([tramo(3, 540, 720)]);
    });

    it.each([
      ['sin la lista de horarios', {}],
      ['horarios que no son una lista', { horarios: 'lunes' }],
      ['un horario que no es un objeto', { horarios: ['lunes'] }],
      ['un horario sin minutoFin', { horarios: [{ diaSemana: 1, minutoInicio: 540 }] }],
      ['un día como texto', { horarios: [{ ...tramo(1, 540, 720), diaSemana: 'lunes' }] }],
      ['minutos con decimales', { horarios: [tramo(1, 540.5, 720)] }],
      ['un campo extra en el horario', { horarios: [{ ...tramo(1, 540, 720), id: 'x' }] }],
      ['listas anidadas', { horarios: [[tramo(1, 540, 720)]] }],
      ['un campo extra en el cuerpo', { horarios: [], dentistId: 'x' }],
      ['más de 100 tramos', { horarios: Array(101).fill(tramo(1, 540, 720)) }],
    ])('responde 400 con un cuerpo mal formado: %s', async (_caso, body) => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().put(ruta(`/dentists/${dentistId}/availability`)),
        token,
      ).send(body);

      expect(res.status).toBe(400);
      expect(await horariosEnBd(dentistId)).toEqual([]);
    });
  });

  describe('POST /dentists/:id/blocks', () => {
    const cuerpo = {
      inicio: '2026-11-10T14:00:00.000Z',
      fin: '2026-11-10T15:00:00.000Z',
      motivo: 'Congreso',
    };
    // Cita de 10:00 a 10:30 en La Paz, el día del bloque.
    const horaInicio = new Date('2026-11-10T14:00:00.000Z');
    const horaFin = new Date('2026-11-10T14:30:00.000Z');

    const bloquesEnBd = (dentistId: string) =>
      prisma.unavailableBlock.count({ where: { dentistId } });

    it('responde 401 sin token', async () => {
      const dentistId = await nuevoOdontologoId();

      const res = await http()
        .post(ruta(`/dentists/${dentistId}/blocks`))
        .send(cuerpo);

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', tokenDePaciente],
      ['ODONTOLOGO', tokenDeOdontologo],
    ])('responde 403 con el rol %s y no guarda nada', async (_rol, obtenerToken) => {
      const dentistId = await nuevoOdontologoId();
      const token = await obtenerToken();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        cuerpo,
      );

      expect(res.status).toBe(403);
      expect(await bloquesEnBd(dentistId)).toBe(0);
    });

    it('crea el bloque, lo persiste y aparece en la disponibilidad', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        cuerpo,
      );

      const creado = { id: expect.any(String), ...cuerpo };
      expect(res.status).toBe(201);
      expect(res.body).toEqual(creado);
      const enBd = await prisma.unavailableBlock.findUnique({ where: { id: res.body.id } });
      expect(enBd).toMatchObject({
        dentistId,
        inicio: new Date(cuerpo.inicio),
        fin: new Date(cuerpo.fin),
        motivo: 'Congreso',
      });
      const consulta = await conToken(
        http().get(ruta(`/dentists/${dentistId}/availability`)),
        token,
      );
      expect(consulta.body.bloques).toEqual([creado]);
    });

    it('sin motivo lo guarda como null', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send({
        inicio: cuerpo.inicio,
        fin: cuerpo.fin,
      });

      expect(res.status).toBe(201);
      expect(res.body.motivo).toBeNull();
    });

    it('acepta fechas con otra zona horaria y las devuelve en UTC', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send({
        inicio: '2026-11-10T10:00:00-04:00',
        fin: '2026-11-10T11:00:00-04:00',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ inicio: cuerpo.inicio, fin: cuerpo.fin });
    });

    it('responde 404 si el odontólogo no existe', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().post(ruta(`/dentists/${ID_INEXISTENTE}/blocks`)),
        token,
      ).send(cuerpo);

      expect(res.status).toBe(404);
    });

    it.each([
      ['termina antes de empezar', '2026-11-10T15:00:00.000Z', '2026-11-10T14:00:00.000Z'],
      ['termina cuando empieza', '2026-11-10T14:00:00.000Z', '2026-11-10T14:00:00.000Z'],
      ['ya terminó', '2026-11-08T14:00:00.000Z', '2026-11-08T15:00:00.000Z'],
      ['termina justo ahora', '2026-11-09T13:00:00.000Z', '2026-11-09T14:00:00.000Z'],
    ])('responde 400 FECHA_INVALIDA si el bloque %s', async (_caso, inicio, fin) => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send({
        inicio,
        fin,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FECHA_INVALIDA');
      expect(await bloquesEnBd(dentistId)).toBe(0);
    });

    it.each([
      ['sin inicio', { fin: cuerpo.fin }],
      ['sin fin', { inicio: cuerpo.inicio }],
      ['una fecha que no existe', { ...cuerpo, inicio: '2026-02-30T14:00:00.000Z' }],
      ['un texto en vez de fecha', { ...cuerpo, fin: 'mañana' }],
      ['una fecha sin hora', { ...cuerpo, inicio: '2026-11-10' }],
      ['una fecha sin zona horaria', { ...cuerpo, inicio: '2026-11-10T14:00:00' }],
      ['una fecha en formato de semana', { ...cuerpo, inicio: '2026-W46-2T14:00:00Z' }],
      ['un número en vez de fecha', { ...cuerpo, inicio: 1794000000000 }],
      ['un motivo que no es texto', { ...cuerpo, motivo: 5 }],
      ['un motivo de más de 200 caracteres', { ...cuerpo, motivo: 'x'.repeat(201) }],
      ['un campo extra', { ...cuerpo, dentistId: 'x' }],
    ])('responde 400 con un cuerpo mal formado: %s', async (_caso, body) => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        body,
      );

      expect(res.status).toBe(400);
      expect(await bloquesEnBd(dentistId)).toBe(0);
    });

    it.each(['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA'] as const)(
      'responde 409 si choca con una cita %s y no guarda el bloque',
      async (estado) => {
        const dentistId = await nuevoOdontologoId();
        await crearCita(prisma, { dentistId, horaInicio, horaFin, estado });
        const token = await tokenDeAdmin();

        const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
          cuerpo,
        );

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('BLOQUE_CON_CITAS');
        expect(await bloquesEnBd(dentistId)).toBe(0);
      },
    );

    it.each([
      ['la cita empieza antes y termina dentro', '2026-11-10T13:45:00Z', '2026-11-10T14:15:00Z'],
      ['la cita empieza dentro y termina después', '2026-11-10T14:45:00Z', '2026-11-10T15:15:00Z'],
      ['el bloque está contenido en la cita', '2026-11-10T13:00:00Z', '2026-11-10T16:00:00Z'],
    ])('responde 409 con un solapamiento parcial: %s', async (_caso, inicioCita, finCita) => {
      const dentistId = await nuevoOdontologoId();
      await crearCita(prisma, {
        dentistId,
        horaInicio: new Date(inicioCita),
        horaFin: new Date(finCita),
      });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        cuerpo,
      );

      expect(res.status).toBe(409);
    });

    it('permite el bloque sobre una cita CANCELADA, que no ocupa el horario', async () => {
      const dentistId = await nuevoOdontologoId();
      await crearCita(prisma, { dentistId, horaInicio, horaFin, estado: 'CANCELADA' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        cuerpo,
      );

      expect(res.status).toBe(201);
    });

    it.each([
      ['termina cuando empieza el bloque', '2026-11-10T13:30:00Z', '2026-11-10T14:00:00Z'],
      ['empieza cuando termina el bloque', '2026-11-10T15:00:00Z', '2026-11-10T15:30:00Z'],
    ])('permite el bloque consecutivo a una cita que %s', async (_caso, inicioCita, finCita) => {
      const dentistId = await nuevoOdontologoId();
      await crearCita(prisma, {
        dentistId,
        horaInicio: new Date(inicioCita),
        horaFin: new Date(finCita),
      });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        cuerpo,
      );

      expect(res.status).toBe(201);
    });

    it('permite el bloque en el horario de una cita de otro odontólogo', async () => {
      const dentistId = await nuevoOdontologoId();
      const otroId = await nuevoOdontologoId();
      await crearCita(prisma, { dentistId: otroId, horaInicio, horaFin });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta(`/dentists/${dentistId}/blocks`)), token).send(
        cuerpo,
      );

      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /dentists/:id/blocks/:blockId', () => {
    const crearBloque = (dentistId: string) =>
      prisma.unavailableBlock.create({
        data: {
          dentistId,
          inicio: new Date('2026-11-12T14:00:00.000Z'),
          fin: new Date('2026-11-12T15:00:00.000Z'),
        },
      });
    const existe = async (blockId: string) =>
      (await prisma.unavailableBlock.count({ where: { id: blockId } })) === 1;

    it('responde 401 sin token y conserva el bloque', async () => {
      const dentistId = await nuevoOdontologoId();
      const bloque = await crearBloque(dentistId);

      const res = await http().delete(ruta(`/dentists/${dentistId}/blocks/${bloque.id}`));

      expect(res.status).toBe(401);
      expect(await existe(bloque.id)).toBe(true);
    });

    it.each([
      ['PACIENTE', tokenDePaciente],
      ['ODONTOLOGO', tokenDeOdontologo],
    ])('responde 403 con el rol %s y conserva el bloque', async (_rol, obtenerToken) => {
      const dentistId = await nuevoOdontologoId();
      const bloque = await crearBloque(dentistId);
      const token = await obtenerToken();

      const res = await conToken(
        http().delete(ruta(`/dentists/${dentistId}/blocks/${bloque.id}`)),
        token,
      );

      expect(res.status).toBe(403);
      expect(await existe(bloque.id)).toBe(true);
    });

    it('borra el bloque y deja de aparecer en la disponibilidad', async () => {
      const dentistId = await nuevoOdontologoId();
      const bloque = await crearBloque(dentistId);
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().delete(ruta(`/dentists/${dentistId}/blocks/${bloque.id}`)),
        token,
      );

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(await existe(bloque.id)).toBe(false);
      const consulta = await conToken(
        http().get(ruta(`/dentists/${dentistId}/availability`)),
        token,
      );
      expect(consulta.body.bloques).toEqual([]);
    });

    it('responde 404 con un bloque de otro odontólogo y no lo borra', async () => {
      const dentistId = await nuevoOdontologoId();
      const otroId = await nuevoOdontologoId();
      const ajeno = await crearBloque(otroId);
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().delete(ruta(`/dentists/${dentistId}/blocks/${ajeno.id}`)),
        token,
      );

      expect(res.status).toBe(404);
      expect(await existe(ajeno.id)).toBe(true);
    });

    it('responde 404 si el bloque no existe', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().delete(ruta(`/dentists/${dentistId}/blocks/${ID_INEXISTENTE}`)),
        token,
      );

      expect(res.status).toBe(404);
    });

    it('responde 404 si el odontólogo no existe y no borra el bloque', async () => {
      const dentistId = await nuevoOdontologoId();
      const bloque = await crearBloque(dentistId);
      const token = await tokenDeAdmin();

      const res = await conToken(
        http().delete(ruta(`/dentists/${ID_INEXISTENTE}/blocks/${bloque.id}`)),
        token,
      );

      expect(res.status).toBe(404);
      expect(await existe(bloque.id)).toBe(true);
    });
  });
});
