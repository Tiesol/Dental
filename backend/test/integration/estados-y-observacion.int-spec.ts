import { INestApplication } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearCita, crearOdontologo, crearPaciente } from '../helpers/factories';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('Estados y observación (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    app = await createTestApp({ ahora: new Date('2026-11-09T14:00:00.000Z') });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());

  async function escenario(estado: AppointmentStatus = 'PENDIENTE') {
    const odontologo = await crearOdontologo(prisma);
    const cita = await crearCita(prisma, {
      dentistId: odontologo.dentist!.id,
      horaInicio: new Date('2026-11-10T13:00:00.000Z'),
      horaFin: new Date('2026-11-10T13:30:00.000Z'),
      estado,
    });
    return { cita, odontologo, tokenOdontologo: await loginComo(app, odontologo) };
  }
  const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));

  const cambiarEstado = (id: string, token: string, estado: string) =>
    conToken(http().patch(ruta(`/appointments/${id}/status`)), token).send({ estado });
  const registrar = (id: string, token: string, texto: unknown) =>
    conToken(http().post(ruta(`/appointments/${id}/observation`)), token).send({ texto });
  const estadoEnBd = async (id: string) =>
    (await prisma.appointment.findUniqueOrThrow({ where: { id } })).estado;

  describe('PATCH /appointments/:id/status', () => {
    it('responde 401 sin token', async () => {
      const { cita } = await escenario();

      const res = await http()
        .patch(ruta(`/appointments/${cita.id}/status`))
        .send({ estado: 'CONFIRMADA' });

      expect(res.status).toBe(401);
    });

    it('responde 403 a un paciente, también al dueño, y la cita no cambia', async () => {
      const { cita } = await escenario();
      const { user } = await prisma.patient.findUniqueOrThrow({
        where: { id: cita.patientId },
        include: { user: true },
      });
      const token = await loginComo(app, await crearPaciente(prisma));
      const tokenDueno = await loginComo(app, { email: user.email, password: 'secreta123' });

      const ajeno = await cambiarEstado(cita.id, token, 'CONFIRMADA');
      const propio = await cambiarEstado(cita.id, tokenDueno, 'CONFIRMADA');

      expect(ajeno.status).toBe(403);
      expect(propio.status).toBe(403);
      expect(await estadoEnBd(cita.id)).toBe('PENDIENTE');
    });

    it('recorre PENDIENTE, CONFIRMADA, EN_ATENCION y FINALIZADA', async () => {
      const { cita, tokenOdontologo } = await escenario();
      const admin = await tokenDeAdmin();

      const confirmar = await cambiarEstado(cita.id, admin, 'CONFIRMADA');
      expect(confirmar.status).toBe(200);
      expect(confirmar.body.estado).toBe('CONFIRMADA');
      expect(await estadoEnBd(cita.id)).toBe('CONFIRMADA');

      const atender = await cambiarEstado(cita.id, tokenOdontologo, 'EN_ATENCION');
      expect(atender.status).toBe(200);
      expect(await estadoEnBd(cita.id)).toBe('EN_ATENCION');

      await registrar(cita.id, tokenOdontologo, 'Limpieza sin complicaciones').expect(201);

      const finalizar = await cambiarEstado(cita.id, tokenOdontologo, 'FINALIZADA');
      expect(finalizar.status).toBe(200);
      expect(finalizar.body).toMatchObject({
        estado: 'FINALIZADA',
        observacion: { texto: 'Limpieza sin complicaciones' },
      });
      expect(await estadoEnBd(cita.id)).toBe('FINALIZADA');
    });

    it('finalizar sin observación responde 409 y la cita sigue EN_ATENCION', async () => {
      const { cita, tokenOdontologo } = await escenario('EN_ATENCION');

      const res = await cambiarEstado(cita.id, tokenOdontologo, 'FINALIZADA');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OBSERVACION_REQUERIDA');
      expect(await estadoEnBd(cita.id)).toBe('EN_ATENCION');
    });

    it('otro odontólogo recibe 403 y la cita no cambia', async () => {
      const { cita } = await escenario('CONFIRMADA');
      const token = await loginComo(app, await crearOdontologo(prisma));

      const res = await cambiarEstado(cita.id, token, 'EN_ATENCION');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESO_DENEGADO_A_CITA');
      expect(await estadoEnBd(cita.id)).toBe('CONFIRMADA');
    });

    it('el odontólogo asignado no confirma una cita PENDIENTE (D2)', async () => {
      const { cita, tokenOdontologo } = await escenario();

      const res = await cambiarEstado(cita.id, tokenOdontologo, 'CONFIRMADA');

      expect(res.status).toBe(403);
      expect(await estadoEnBd(cita.id)).toBe('PENDIENTE');
    });

    it('el ADMIN no inicia la atención', async () => {
      const { cita } = await escenario('CONFIRMADA');
      const token = await tokenDeAdmin();

      const res = await cambiarEstado(cita.id, token, 'EN_ATENCION');

      expect(res.status).toBe(403);
      expect(await estadoEnBd(cita.id)).toBe('CONFIRMADA');
    });

    it.each([
      ['PENDIENTE', 'EN_ATENCION'],
      ['PENDIENTE', 'FINALIZADA'],
      ['CONFIRMADA', 'FINALIZADA'],
      ['EN_ATENCION', 'CONFIRMADA'],
      ['FINALIZADA', 'CONFIRMADA'],
      ['CANCELADA', 'CONFIRMADA'],
    ] as const)('responde 409 con la transición inválida %s -> %s', async (desde, hacia) => {
      const { cita, tokenOdontologo } = await escenario(desde);

      const res = await cambiarEstado(cita.id, tokenOdontologo, hacia);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('TRANSICION_DE_ESTADO_INVALIDA');
      expect(await estadoEnBd(cita.id)).toBe(desde);
    });

    it('una cita FINALIZADA no vuelve a PENDIENTE: responde 409 y no cambia', async () => {
      const { cita } = await escenario('FINALIZADA');
      const token = await tokenDeAdmin();

      const res = await cambiarEstado(cita.id, token, 'PENDIENTE');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('TRANSICION_DE_ESTADO_INVALIDA');
      expect(await estadoEnBd(cita.id)).toBe('FINALIZADA');
    });

    it.each(['CANCELADA', 'PERDIDA'])('responde 400 con estado %s', async (estado) => {
      const { cita } = await escenario();
      const token = await tokenDeAdmin();

      const res = await cambiarEstado(cita.id, token, estado);

      expect(res.status).toBe(400);
      expect(await estadoEnBd(cita.id)).toBe('PENDIENTE');
    });

    it('responde 404 si la cita no existe', async () => {
      const token = await tokenDeAdmin();

      const res = await cambiarEstado(ID_INEXISTENTE, token, 'CONFIRMADA');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /appointments/:id/observation', () => {
    it('responde 401 sin token', async () => {
      const { cita } = await escenario('EN_ATENCION');

      const res = await http()
        .post(ruta(`/appointments/${cita.id}/observation`))
        .send({ texto: 'Bien' });

      expect(res.status).toBe(401);
    });

    it.each([
      ['PACIENTE', crearPaciente],
      ['ADMIN', crearAdmin],
    ])('responde 403 con el rol %s y no guarda nada', async (_rol, crear) => {
      const { cita } = await escenario('EN_ATENCION');
      const token = await loginComo(app, await crear(prisma));

      const res = await registrar(cita.id, token, 'Bien');

      expect(res.status).toBe(403);
      expect(await prisma.observation.count()).toBe(0);
    });

    it('otro odontólogo recibe 403 y no guarda nada', async () => {
      const { cita } = await escenario('EN_ATENCION');
      const token = await loginComo(app, await crearOdontologo(prisma));

      const res = await registrar(cita.id, token, 'Bien');

      expect(res.status).toBe(403);
      expect(await prisma.observation.count()).toBe(0);
    });

    it('la registra, la persiste y aparece en la cita', async () => {
      const { cita, tokenOdontologo } = await escenario('EN_ATENCION');

      const res = await registrar(cita.id, tokenOdontologo, '  Limpieza sin complicaciones  ');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        texto: 'Limpieza sin complicaciones',
        createdAt: expect.any(String),
      });
      const enBd = await prisma.observation.findUnique({ where: { appointmentId: cita.id } });
      expect(enBd!.texto).toBe('Limpieza sin complicaciones');
      const detalle = await conToken(http().get(ruta(`/appointments/${cita.id}`)), tokenOdontologo);
      expect(detalle.body.observacion.texto).toBe('Limpieza sin complicaciones');
    });

    it.each(['PENDIENTE', 'CONFIRMADA', 'FINALIZADA', 'CANCELADA'] as const)(
      'responde 409 en una cita %s y no guarda nada',
      async (estado) => {
        const { cita, tokenOdontologo } = await escenario(estado);

        const res = await registrar(cita.id, tokenOdontologo, 'Bien');

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CITA_NO_EN_ATENCION');
        expect(await prisma.observation.count()).toBe(0);
      },
    );

    it('una segunda observación responde 409 y conserva la primera (D5)', async () => {
      const { cita, tokenOdontologo } = await escenario('EN_ATENCION');
      await registrar(cita.id, tokenOdontologo, 'Primera').expect(201);

      const res = await registrar(cita.id, tokenOdontologo, 'Segunda');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OBSERVACION_YA_REGISTRADA');
      const enBd = await prisma.observation.findUnique({ where: { appointmentId: cita.id } });
      expect(enBd!.texto).toBe('Primera');
    });

    it('dos observaciones simultáneas: una da 201 y la otra 409', async () => {
      const { cita, tokenOdontologo } = await escenario('EN_ATENCION');

      const respuestas = await Promise.all([
        registrar(cita.id, tokenOdontologo, 'Una'),
        registrar(cita.id, tokenOdontologo, 'Otra'),
      ]);

      expect(respuestas.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(await prisma.observation.count()).toBe(1);
    });

    it.each([
      ['vacío', ''],
      ['solo con espacios', '   '],
      ['de más de 2000 caracteres', 'x'.repeat(2001)],
      ['que no es texto', 5],
      ['ausente', undefined],
    ])('responde 400 con un texto %s', async (_caso, texto) => {
      const { cita, tokenOdontologo } = await escenario('EN_ATENCION');

      const res = await registrar(cita.id, tokenOdontologo, texto);

      expect(res.status).toBe(400);
      expect(await prisma.observation.count()).toBe(0);
    });

    it('acepta un texto de 2000 caracteres', async () => {
      const { cita, tokenOdontologo } = await escenario('EN_ATENCION');

      const res = await registrar(cita.id, tokenOdontologo, 'x'.repeat(2000));

      expect(res.status).toBe(201);
    });

    it('responde 404 si la cita no existe', async () => {
      const { tokenOdontologo } = await escenario();

      const res = await registrar(ID_INEXISTENTE, tokenOdontologo, 'Bien');

      expect(res.status).toBe(404);
    });
  });
});
