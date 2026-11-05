import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearOdontologo, crearPaciente, crearServicio } from '../helpers/factories';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

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
  const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));
  const tokenDePaciente = async () => loginComo(app, await crearPaciente(prisma));
  const datos = {
    nombre: 'Limpieza dental',
    descripcion: 'Profilaxis y eliminación de sarro',
    duracionMin: 30,
    precioReferencial: 150,
  };

  describe('rutas protegidas', () => {
    const rutas = [
      ['get', '/services'],
      ['get', `/services/${ID_INEXISTENTE}`],
      ['post', '/services'],
      ['patch', `/services/${ID_INEXISTENTE}`],
      ['patch', `/services/${ID_INEXISTENTE}/estado`],
    ] as const;

    it.each(rutas)('%s %s responde 401 sin token', async (metodo, path) => {
      const res = await http()[metodo](ruta(path));

      expect(res.status).toBe(401);
    });

    it.each(rutas.slice(2))('%s %s responde 403 a un PACIENTE', async (metodo, path) => {
      const token = await tokenDePaciente();

      const res = await conToken(http()[metodo](ruta(path)), token);

      expect(res.status).toBe(403);
    });

    it.each(rutas.slice(2))('%s %s responde 403 a un ODONTOLOGO', async (metodo, path) => {
      const token = await loginComo(app, await crearOdontologo(prisma));

      const res = await conToken(http()[metodo](ruta(path)), token);

      expect(res.status).toBe(403);
    });
  });

  describe('gestión por el ADMIN', () => {
    it('crea un servicio y lo persiste', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/services')), token).send(datos);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...datos, activo: true });
      const enBd = await prisma.service.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(enBd).toMatchObject({ nombre: 'Limpieza dental', duracionMin: 30 });
    });

    it('el precio referencial es opcional', async () => {
      const { precioReferencial: _precio, ...sinPrecio } = datos;
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/services')), token).send(sinPrecio);

      expect(res.status).toBe(201);
      expect(res.body.precioReferencial).toBeNull();
    });

    it('responde 409 con un nombre repetido, sin distinguir mayúsculas', async () => {
      await crearServicio(prisma, { nombre: 'Limpieza dental' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/services')), token).send({
        ...datos,
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
    ])('responde 400 con %s y no crea nada', async (_caso, cambios) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/services')), token).send({
        ...datos,
        ...cambios,
      });

      expect(res.status).toBe(400);
      expect(await prisma.service.count()).toBe(0);
    });

    it('edita un servicio y persiste el cambio', async () => {
      const servicio = await crearServicio(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/services/${servicio.id}`)), token).send({
        duracionMin: 45,
      });

      expect(res.status).toBe(200);
      const enBd = await prisma.service.findUniqueOrThrow({ where: { id: servicio.id } });
      expect(enBd.duracionMin).toBe(45);
    });

    it('permite mantener el propio nombre al editar', async () => {
      const servicio = await crearServicio(prisma, { nombre: 'Limpieza' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/services/${servicio.id}`)), token).send({
        nombre: 'limpieza',
      });

      expect(res.status).toBe(200);
    });

    it('al editar responde 409 si el nombre ya es de otro servicio', async () => {
      await crearServicio(prisma, { nombre: 'Ortodoncia' });
      const servicio = await crearServicio(prisma, { nombre: 'Limpieza' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/services/${servicio.id}`)), token).send({
        nombre: 'Ortodoncia',
      });

      expect(res.status).toBe(409);
    });

    it.each([
      ['patch', `/services/${ID_INEXISTENTE}`, { duracionMin: 45 }],
      ['patch', `/services/${ID_INEXISTENTE}/estado`, { activo: false }],
    ] as const)('%s %s responde 404 si no existe', async (metodo, path, cuerpo) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http()[metodo](ruta(path)), token).send(cuerpo);

      expect(res.status).toBe(404);
    });
  });

  describe('servicio deshabilitado', () => {
    async function deshabilitado() {
      const servicio = await crearServicio(prisma);
      const admin = await tokenDeAdmin();
      await conToken(http().patch(ruta(`/services/${servicio.id}/estado`)), admin)
        .send({ activo: false })
        .expect(200);
      return { servicio, admin };
    }

    it('un paciente no lo ve en el catálogo y su detalle responde 404', async () => {
      const { servicio } = await deshabilitado();
      const visible = await crearServicio(prisma);
      const token = await tokenDePaciente();

      const lista = await conToken(http().get(ruta('/services')), token);
      const detalle = await conToken(http().get(ruta(`/services/${servicio.id}`)), token);

      expect((lista.body as { id: string }[]).map((s) => s.id)).toEqual([visible.id]);
      expect(detalle.status).toBe(404);
    });

    it('el ADMIN lo sigue viendo y puede volver a habilitarlo', async () => {
      const { servicio, admin } = await deshabilitado();

      const lista = await conToken(http().get(ruta('/services')), admin);
      const habilitar = await conToken(
        http().patch(ruta(`/services/${servicio.id}/estado`)),
        admin,
      ).send({ activo: true });

      expect((lista.body as { id: string }[]).map((s) => s.id)).toEqual([servicio.id]);
      expect(habilitar.status).toBe(200);
      const enBd = await prisma.service.findUniqueOrThrow({ where: { id: servicio.id } });
      expect(enBd.activo).toBe(true);
    });
  });
});
