import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearOdontologo, crearPaciente, crearServicio } from '../helpers/factories';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

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
  const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));
  const tokenDePaciente = async () => loginComo(app, await crearPaciente(prisma));
  const nuevoOdontologoId = async () => (await crearOdontologo(prisma)).dentist!.id;
  const datos = (serviceIds: string[] = []) => ({
    email: 'Carlos.Rojas@clinica.com',
    password: 'secreta123',
    nombre: 'Dr. Carlos Rojas',
    especialidad: 'Ortodoncia',
    serviceIds,
  });

  describe('rutas protegidas', () => {
    const rutas = [
      ['get', '/dentists'],
      ['get', `/dentists/${ID_INEXISTENTE}`],
      ['post', '/dentists'],
      ['patch', `/dentists/${ID_INEXISTENTE}`],
      ['patch', `/dentists/${ID_INEXISTENTE}/estado`],
      ['put', `/dentists/${ID_INEXISTENTE}/services`],
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

  describe('POST /dentists', () => {
    it('crea el odontólogo con su cuenta, asocia los servicios y persiste todo', async () => {
      const uno = await crearServicio(prisma);
      const dos = await crearServicio(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/dentists')), token).send(
        datos([uno.id, dos.id]),
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
        [uno.id, dos.id].sort(),
      );
      const enBd = await prisma.dentist.findUniqueOrThrow({
        where: { id: res.body.id },
        include: { user: true, services: true },
      });
      expect(enBd.user).toMatchObject({ role: 'ODONTOLOGO', email: 'carlos.rojas@clinica.com' });
      expect(enBd.services).toHaveLength(2);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('el odontólogo creado puede iniciar sesión', async () => {
      const token = await tokenDeAdmin();

      await conToken(http().post(ruta('/dentists')), token)
        .send(datos())
        .expect(201);

      const login = await http()
        .post(ruta('/auth/login'))
        .send({ email: 'carlos.rojas@clinica.com', password: 'secreta123' });
      expect(login.status).toBe(200);
      expect(login.body.user.role).toBe('ODONTOLOGO');
    });

    it('responde 400 si un servicio no existe y no crea nada', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/dentists')), token).send(
        datos([ID_INEXISTENTE]),
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('SERVICIOS_INEXISTENTES');
      expect(await prisma.dentist.count()).toBe(0);
    });

    it('responde 409 si el email ya existe', async () => {
      await crearOdontologo(prisma, { email: 'carlos.rojas@clinica.com' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/dentists')), token).send(datos());

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('EMAIL_YA_REGISTRADO');
    });

    it.each([
      ['sin nombre', { nombre: undefined }],
      ['con una contraseña corta', { password: 'corta' }],
      ['con un email inválido', { email: 'no-es-email' }],
      ['con un campo extra', { role: 'ADMIN' }],
    ])('responde 400 %s', async (_caso, cambios) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/dentists')), token).send({
        ...datos(),
        ...cambios,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('vista según el rol', () => {
    it('quien no es ADMIN recibe la vista pública, sin email y sin servicios deshabilitados', async () => {
      const habilitado = await crearServicio(prisma);
      const deshabilitado = await crearServicio(prisma);
      await prisma.service.update({ where: { id: deshabilitado.id }, data: { activo: false } });
      const dentistId = await nuevoOdontologoId();
      await prisma.dentistService.createMany({
        data: [
          { dentistId, serviceId: habilitado.id },
          { dentistId, serviceId: deshabilitado.id },
        ],
      });
      const token = await tokenDePaciente();

      const res = await conToken(http().get(ruta(`/dentists/${dentistId}`)), token);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('activo');
      expect((res.body.servicios as { id: string }[]).map((s) => s.id)).toEqual([habilitado.id]);
    });

    it('el ADMIN recibe el registro completo', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().get(ruta(`/dentists/${dentistId}`)), token);

      expect(res.body).toMatchObject({ id: dentistId, activo: true, cuentaActiva: true });
      expect(res.body.email).toEqual(expect.any(String));
    });

    it('la lista se puede filtrar por servicio', async () => {
      const servicio = await crearServicio(prisma);
      const conServicio = await nuevoOdontologoId();
      await nuevoOdontologoId();
      await prisma.dentistService.create({
        data: { dentistId: conServicio, serviceId: servicio.id },
      });
      const token = await tokenDePaciente();

      const res = await conToken(
        http().get(ruta('/dentists')).query({ serviceId: servicio.id }),
        token,
      );

      expect((res.body as { id: string }[]).map((d) => d.id)).toEqual([conServicio]);
    });

    it('responde 404 si no existe', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().get(ruta(`/dentists/${ID_INEXISTENTE}`)), token);

      expect(res.status).toBe(404);
    });
  });

  describe('deshabilitado', () => {
    it('desaparece para el paciente, sigue visible para el ADMIN y conserva sus citas', async () => {
      const dentistId = await nuevoOdontologoId();
      const paciente = await crearPaciente(prisma);
      const servicio = await crearServicio(prisma);
      await prisma.appointment.create({
        data: {
          dentistId,
          patientId: paciente.patient!.id,
          serviceId: servicio.id,
          horaInicio: new Date('2026-11-10T13:00:00.000Z'),
          horaFin: new Date('2026-11-10T13:30:00.000Z'),
        },
      });
      const admin = await tokenDeAdmin();
      const tokenPaciente = await loginComo(app, paciente);

      const cambio = await conToken(
        http().patch(ruta(`/dentists/${dentistId}/estado`)),
        admin,
      ).send({ activo: false });

      expect(cambio.status).toBe(200);
      expect(cambio.body.activo).toBe(false);
      const lista = await conToken(http().get(ruta('/dentists')), tokenPaciente);
      expect(lista.body).toEqual([]);
      const detalle = await conToken(http().get(ruta(`/dentists/${dentistId}`)), tokenPaciente);
      expect(detalle.status).toBe(404);
      const paraAdmin = await conToken(http().get(ruta(`/dentists/${dentistId}`)), admin);
      expect(paraAdmin.status).toBe(200);
      expect(await prisma.appointment.count({ where: { dentistId } })).toBe(1);
    });

    it('con la cuenta deshabilitada también desaparece para el paciente', async () => {
      const odontologo = await crearOdontologo(prisma);
      await prisma.user.update({ where: { id: odontologo.id }, data: { activo: false } });
      const token = await tokenDePaciente();

      const res = await conToken(http().get(ruta(`/dentists/${odontologo.dentist!.id}`)), token);

      expect(res.status).toBe(404);
    });
  });

  describe('edición', () => {
    it('PATCH cambia nombre y especialidad, y persiste', async () => {
      const dentistId = await nuevoOdontologoId();
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/dentists/${dentistId}`)), token).send({
        nombre: '  Dra. Laura  ',
        especialidad: 'Endodoncia',
      });

      expect(res.status).toBe(200);
      const enBd = await prisma.dentist.findUniqueOrThrow({ where: { id: dentistId } });
      expect(enBd).toMatchObject({ nombre: 'Dra. Laura', especialidad: 'Endodoncia' });
    });

    it('PUT services reemplaza todos los servicios y quita repetidos', async () => {
      const anterior = await crearServicio(prisma);
      const nuevo = await crearServicio(prisma);
      const dentistId = await nuevoOdontologoId();
      await prisma.dentistService.create({ data: { dentistId, serviceId: anterior.id } });
      const token = await tokenDeAdmin();

      const res = await conToken(http().put(ruta(`/dentists/${dentistId}/services`)), token).send({
        serviceIds: [nuevo.id, nuevo.id],
      });

      expect(res.status).toBe(200);
      const enBd = await prisma.dentistService.findMany({ where: { dentistId } });
      expect(enBd.map((s) => s.serviceId)).toEqual([nuevo.id]);
    });

    it('PUT services responde 400 con un servicio inexistente y conserva los anteriores', async () => {
      const anterior = await crearServicio(prisma);
      const dentistId = await nuevoOdontologoId();
      await prisma.dentistService.create({ data: { dentistId, serviceId: anterior.id } });
      const token = await tokenDeAdmin();

      const res = await conToken(http().put(ruta(`/dentists/${dentistId}/services`)), token).send({
        serviceIds: [ID_INEXISTENTE],
      });

      expect(res.status).toBe(400);
      expect(await prisma.dentistService.count({ where: { dentistId } })).toBe(1);
    });

    it.each([
      ['patch', `/dentists/${ID_INEXISTENTE}`, { nombre: 'X' }],
      ['patch', `/dentists/${ID_INEXISTENTE}/estado`, { activo: false }],
      ['put', `/dentists/${ID_INEXISTENTE}/services`, { serviceIds: [] }],
    ] as const)('%s %s responde 404 si no existe', async (metodo, path, cuerpo) => {
      const token = await tokenDeAdmin();

      const res = await conToken(http()[metodo](ruta(path)), token).send(cuerpo);

      expect(res.status).toBe(404);
    });
  });
});
