import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createDentist, createPatient, createService } from '../helpers/factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Servicios (integración)', () => {
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
  const data = {
    nombre: 'Limpieza dental',
    descripcion: 'Profilaxis y eliminación de sarro',
    duracionMin: 30,
    precioReferencial: 150,
  };

  describe('rutas protegidas', () => {
    const routes = [
      ['get', '/services'],
      ['get', `/services/${MISSING_ID}`],
      ['post', '/services'],
      ['patch', `/services/${MISSING_ID}`],
      ['patch', `/services/${MISSING_ID}/estado`],
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

  describe('gestión por el ADMIN', () => {
    it('crea un servicio y lo persiste', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/services')), token).send(data);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...data, activo: true });
      const inDb = await prisma.service.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(inDb).toMatchObject({ nombre: 'Limpieza dental', duracionMin: 30 });
    });

    it('el precio referencial es opcional', async () => {
      const { precioReferencial: _price, ...withoutPrice } = data;
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/services')), token).send(withoutPrice);

      expect(res.status).toBe(201);
      expect(res.body.precioReferencial).toBeNull();
    });

    it('responde 409 con un nombre repetido, sin distinguir mayúsculas', async () => {
      await createService(prisma, { nombre: 'Limpieza dental' });
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/services')), token).send({
        ...data,
        nombre: 'LIMPIEZA  dental',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('NOMBRE_DE_SERVICIO_DUPLICADO');
    });

    it.each([
      ['duración cero', { duracionMin: 0 }],
      ['duración negativa', { duracionMin: -30 }],
      ['duración con decimales', { duracionMin: 1.5 }],
      ['duración mayor que 480', { duracionMin: 481 }],
      ['precio negativo', { precioReferencial: -1 }],
      ['nombre vacío', { nombre: '' }],
      ['descripción ausente', { descripcion: undefined }],
      ['un campo extra', { id: 'x' }],
    ])('responde 400 con %s y no crea nada', async (_testCase, changes) => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/services')), token).send({
        ...data,
        ...changes,
      });

      expect(res.status).toBe(400);
      expect(await prisma.service.count()).toBe(0);
    });

    it('edita un servicio y persiste el cambio', async () => {
      const service = await createService(prisma);
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/services/${service.id}`)), token).send({
        duracionMin: 45,
      });

      expect(res.status).toBe(200);
      const inDb = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
      expect(inDb.duracionMin).toBe(45);
    });

    it('permite mantener el propio nombre al editar', async () => {
      const service = await createService(prisma, { nombre: 'Limpieza' });
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/services/${service.id}`)), token).send({
        nombre: 'limpieza',
      });

      expect(res.status).toBe(200);
    });

    it('al editar responde 409 si el nombre ya es de otro servicio', async () => {
      await createService(prisma, { nombre: 'Ortodoncia' });
      const service = await createService(prisma, { nombre: 'Limpieza' });
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/services/${service.id}`)), token).send({
        nombre: 'Ortodoncia',
      });

      expect(res.status).toBe(409);
    });

    it.each([
      ['patch', `/services/${MISSING_ID}`, { duracionMin: 45 }],
      ['patch', `/services/${MISSING_ID}/estado`, { activo: false }],
    ] as const)('%s %s responde 404 si no existe', async (method, path, body) => {
      const token = await adminToken();

      const res = await withToken(http()[method](apiPath(path)), token).send(body);

      expect(res.status).toBe(404);
    });
  });

  describe('servicio deshabilitado', () => {
    async function disabled() {
      const service = await createService(prisma);
      const admin = await adminToken();
      await withToken(http().patch(apiPath(`/services/${service.id}/estado`)), admin)
        .send({ activo: false })
        .expect(200);
      return { service, admin };
    }

    it('un paciente no lo ve en el catálogo y su detalle responde 404', async () => {
      const { service } = await disabled();
      const visible = await createService(prisma);
      const token = await patientToken();

      const list = await withToken(http().get(apiPath('/services')), token);
      const detail = await withToken(http().get(apiPath(`/services/${service.id}`)), token);

      expect((list.body as { id: string }[]).map((s) => s.id)).toEqual([visible.id]);
      expect(detail.status).toBe(404);
    });

    it('el ADMIN lo sigue viendo y puede volver a habilitarlo', async () => {
      const { service, admin } = await disabled();

      const list = await withToken(http().get(apiPath('/services')), admin);
      const enable = await withToken(
        http().patch(apiPath(`/services/${service.id}/estado`)),
        admin,
      ).send({ activo: true });

      expect((list.body as { id: string }[]).map((s) => s.id)).toEqual([service.id]);
      expect(enable.status).toBe(200);
      const inDb = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
      expect(inDb.activo).toBe(true);
    });
  });
});
