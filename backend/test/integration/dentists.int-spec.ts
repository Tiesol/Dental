import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createDentist, createPatient, createService } from '../helpers/factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Odontólogos (integración)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => resetDb(prisma));

  const http = () => request(app.getHttpServer());
  const adminToken = async () => loginAs(app, await createAdmin(prisma));
  const patientToken = async () => loginAs(app, await createPatient(prisma));
  const newDentistId = async () => (await createDentist(prisma)).dentist!.id;
  const data = (serviceIds: string[] = []) => ({
    email: 'Carlos.Rojas@clinica.com',
    password: 'secreta123',
    nombre: 'Dr. Carlos Rojas',
    especialidad: 'Ortodoncia',
    serviceIds,
  });

  describe('rutas protegidas', () => {
    const routes = [
      ['get', '/dentists'],
      ['get', `/dentists/${MISSING_ID}`],
      ['post', '/dentists'],
      ['patch', `/dentists/${MISSING_ID}`],
      ['patch', `/dentists/${MISSING_ID}/estado`],
      ['put', `/dentists/${MISSING_ID}/services`],
    ] as const;

    it.each(routes)('%s %s responde 401 sin token', async (method, path) => {
      const res = await http()[method](apiPath(path));

      expect(res.status).toBe(401);
    });

    it.each(routes.slice(2))('%s %s responde 403 a un PACIENTE', async (method, path) => {
      const token = await patientToken();

      const res = await withToken(http()[method](apiPath(path)), token);

      expect(res.status).toBe(403);
    });

    it.each(routes.slice(2))('%s %s responde 403 a un ODONTOLOGO', async (method, path) => {
      const token = await loginAs(app, await createDentist(prisma));

      const res = await withToken(http()[method](apiPath(path)), token);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /dentists', () => {
    it('crea el odontólogo con su cuenta, asocia los servicios y persiste todo', async () => {
      const one = await createService(prisma);
      const two = await createService(prisma);
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/dentists')), token).send(
        data([one.id, two.id]),
      );

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        email: 'carlos.rojas@clinica.com',
        nombre: 'Dr. Carlos Rojas',
        especialidad: 'Ortodoncia',
        activo: true,
        cuentaActiva: true,
      });
      expect((res.body.servicios as { id: string }[]).map((s) => s.id).sort()).toEqual(
        [one.id, two.id].sort(),
      );
      const inDb = await prisma.dentist.findUniqueOrThrow({
        where: { id: res.body.id },
        include: { user: true, services: true },
      });
      expect(inDb.user).toMatchObject({ role: 'ODONTOLOGO', email: 'carlos.rojas@clinica.com' });
      expect(inDb.services).toHaveLength(2);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('el odontólogo creado puede iniciar sesión', async () => {
      const token = await adminToken();

      await withToken(http().post(apiPath('/dentists')), token)
        .send(data())
        .expect(201);

      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ email: 'carlos.rojas@clinica.com', password: 'secreta123' });
      expect(login.status).toBe(200);
      expect(login.body.user.role).toBe('ODONTOLOGO');
    });

    it('responde 400 si un servicio no existe y no crea nada', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/dentists')), token).send(
        data([MISSING_ID]),
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('SERVICIOS_INEXISTENTES');
      expect(await prisma.dentist.count()).toBe(0);
    });

    it('responde 409 si el email ya existe', async () => {
      await createDentist(prisma, { email: 'carlos.rojas@clinica.com' });
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/dentists')), token).send(data());

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('EMAIL_YA_REGISTRADO');
    });

    it.each([
      ['sin nombre', { nombre: undefined }],
      ['con una contraseña corta', { password: 'corta' }],
      ['con un email inválido', { email: 'no-es-email' }],
      ['con un campo extra', { role: 'ADMIN' }],
    ])('responde 400 %s', async (_testCase, changes) => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/dentists')), token).send({
        ...data(),
        ...changes,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('vista según el rol', () => {
    it('quien no es ADMIN recibe la vista pública, sin email y sin servicios deshabilitados', async () => {
      const enabled = await createService(prisma);
      const disabled = await createService(prisma);
      await prisma.service.update({ where: { id: disabled.id }, data: { activo: false } });
      const dentistId = await newDentistId();
      await prisma.dentistService.createMany({
        data: [
          { dentistId, serviceId: enabled.id },
          { dentistId, serviceId: disabled.id },
        ],
      });
      const token = await patientToken();

      const res = await withToken(http().get(apiPath(`/dentists/${dentistId}`)), token);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('activo');
      expect((res.body.servicios as { id: string }[]).map((s) => s.id)).toEqual([enabled.id]);
    });

    it('el ADMIN recibe el registro completo', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(http().get(apiPath(`/dentists/${dentistId}`)), token);

      expect(res.body).toMatchObject({ id: dentistId, activo: true, cuentaActiva: true });
      expect(res.body.email).toEqual(expect.any(String));
    });

    it('la lista se puede filtrar por servicio', async () => {
      const service = await createService(prisma);
      const withService = await newDentistId();
      await newDentistId();
      await prisma.dentistService.create({
        data: { dentistId: withService, serviceId: service.id },
      });
      const token = await patientToken();

      const res = await withToken(
        http().get(apiPath('/dentists')).query({ serviceId: service.id }),
        token,
      );

      expect((res.body as { id: string }[]).map((d) => d.id)).toEqual([withService]);
    });

    it('responde 404 si no existe', async () => {
      const token = await adminToken();

      const res = await withToken(http().get(apiPath(`/dentists/${MISSING_ID}`)), token);

      expect(res.status).toBe(404);
    });
  });

  describe('deshabilitado', () => {
    it('desaparece para el paciente, sigue visible para el ADMIN y conserva sus citas', async () => {
      const dentistId = await newDentistId();
      const patient = await createPatient(prisma);
      const service = await createService(prisma);
      await prisma.appointment.create({
        data: {
          dentistId,
          patientId: patient.patient!.id,
          serviceId: service.id,
          horaInicio: new Date('2026-11-10T13:00:00.000Z'),
          horaFin: new Date('2026-11-10T13:30:00.000Z'),
        },
      });
      const admin = await adminToken();
      const patientToken = await loginAs(app, patient);

      const change = await withToken(
        http().patch(apiPath(`/dentists/${dentistId}/estado`)),
        admin,
      ).send({ activo: false });

      expect(change.status).toBe(200);
      expect(change.body.activo).toBe(false);
      const list = await withToken(http().get(apiPath('/dentists')), patientToken);
      expect(list.body).toEqual([]);
      const detail = await withToken(http().get(apiPath(`/dentists/${dentistId}`)), patientToken);
      expect(detail.status).toBe(404);
      const forAdmin = await withToken(http().get(apiPath(`/dentists/${dentistId}`)), admin);
      expect(forAdmin.status).toBe(200);
      expect(await prisma.appointment.count({ where: { dentistId } })).toBe(1);
    });

    it('con la cuenta deshabilitada también desaparece para el paciente', async () => {
      const dentist = await createDentist(prisma);
      await prisma.user.update({ where: { id: dentist.id }, data: { activo: false } });
      const token = await patientToken();

      const res = await withToken(http().get(apiPath(`/dentists/${dentist.dentist!.id}`)), token);

      expect(res.status).toBe(404);
    });
  });

  describe('edición', () => {
    it('PATCH cambia nombre y especialidad, y persiste', async () => {
      const dentistId = await newDentistId();
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/dentists/${dentistId}`)), token).send({
        nombre: '  Dra. Laura  ',
        especialidad: 'Endodoncia',
      });

      expect(res.status).toBe(200);
      const inDb = await prisma.dentist.findUniqueOrThrow({ where: { id: dentistId } });
      expect(inDb).toMatchObject({ nombre: 'Dra. Laura', especialidad: 'Endodoncia' });
    });

    it('PUT services reemplaza todos los servicios y quita repetidos', async () => {
      const previous = await createService(prisma);
      const created = await createService(prisma);
      const dentistId = await newDentistId();
      await prisma.dentistService.create({ data: { dentistId, serviceId: previous.id } });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/services`)),
        token,
      ).send({
        serviceIds: [created.id, created.id],
      });

      expect(res.status).toBe(200);
      const inDb = await prisma.dentistService.findMany({ where: { dentistId } });
      expect(inDb.map((s) => s.serviceId)).toEqual([created.id]);
    });

    it('PUT services responde 400 con un servicio inexistente y conserva los anteriores', async () => {
      const previous = await createService(prisma);
      const dentistId = await newDentistId();
      await prisma.dentistService.create({ data: { dentistId, serviceId: previous.id } });
      const token = await adminToken();

      const res = await withToken(
        http().put(apiPath(`/dentists/${dentistId}/services`)),
        token,
      ).send({
        serviceIds: [MISSING_ID],
      });

      expect(res.status).toBe(400);
      expect(await prisma.dentistService.count({ where: { dentistId } })).toBe(1);
    });

    it.each([
      ['patch', `/dentists/${MISSING_ID}`, { nombre: 'X' }],
      ['patch', `/dentists/${MISSING_ID}/estado`, { activo: false }],
      ['put', `/dentists/${MISSING_ID}/services`, { serviceIds: [] }],
    ] as const)('%s %s responde 404 si no existe', async (method, path, body) => {
      const token = await adminToken();

      const res = await withToken(http()[method](apiPath(path)), token).send(body);

      expect(res.status).toBe(404);
    });
  });
});
