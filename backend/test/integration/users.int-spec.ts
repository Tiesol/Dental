import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { withToken, loginAs, apiPath } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { createAdmin, createDentist, createPatient } from '../helpers/factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Usuarios (integración)', () => {
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

  describe('rutas protegidas', () => {
    const adminRoutes = [
      ['get', '/users'],
      ['post', '/users'],
      ['get', `/users/${MISSING_ID}`],
      ['patch', `/users/${MISSING_ID}`],
      ['patch', `/users/${MISSING_ID}/estado`],
    ] as const;
    const ownRoutes = [
      ['get', '/users/me'],
      ['patch', '/users/me'],
      ['patch', '/users/me/password'],
    ] as const;

    it.each([...adminRoutes, ...ownRoutes])(
      '%s %s responde 401 sin token',
      async (method, path) => {
        const res = await http()[method](apiPath(path));

        expect(res.status).toBe(401);
      },
    );

    it.each(adminRoutes)('%s %s responde 403 a un PACIENTE', async (method, path) => {
      const token = await loginAs(app, await createPatient(prisma));

      const res = await withToken(http()[method](apiPath(path)), token);

      expect(res.status).toBe(403);
    });

    it.each(adminRoutes)('%s %s responde 403 a un ODONTOLOGO', async (method, path) => {
      const token = await loginAs(app, await createDentist(prisma));

      const res = await withToken(http()[method](apiPath(path)), token);

      expect(res.status).toBe(403);
    });
  });

  describe('gestión por el ADMIN', () => {
    it('crea un ODONTOLOGO con su perfil, sin devolver el hash', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/users')), token).send({
        email: 'Nueva@Clinica.com',
        password: 'secreta123',
        role: 'ODONTOLOGO',
        nombre: 'Dra. Nueva',
        especialidad: 'General',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'nueva@clinica.com', role: 'ODONTOLOGO' });
      expect(res.body).not.toHaveProperty('passwordHash');
      const inDb = await prisma.user.findUniqueOrThrow({
        where: { email: 'nueva@clinica.com' },
        include: { dentist: true },
      });
      expect(inDb.dentist).toMatchObject({ nombre: 'Dra. Nueva', especialidad: 'General' });
    });

    it('crea otro ADMIN, que no tiene perfil', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/users')), token).send({
        email: 'otro@clinica.com',
        password: 'secreta123',
        role: 'ADMIN',
      });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('ADMIN');
    });

    it('rechaza crear un PACIENTE: se registran solos', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/users')), token).send({
        email: 'paciente@mail.com',
        password: 'secreta123',
        role: 'PACIENTE',
      });

      expect(res.status).toBe(400);
    });

    it('rechaza un ODONTOLOGO sin nombre ni especialidad', async () => {
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/users')), token).send({
        email: 'nueva@clinica.com',
        password: 'secreta123',
        role: 'ODONTOLOGO',
      });

      expect(res.status).toBe(400);
    });

    it('responde 409 con un email ya registrado', async () => {
      await createPatient(prisma, { email: 'repetido@mail.com' });
      const token = await adminToken();

      const res = await withToken(http().post(apiPath('/users')), token).send({
        email: 'REPETIDO@mail.com',
        password: 'secreta123',
        role: 'ADMIN',
      });

      expect(res.status).toBe(409);
    });

    it('lista los usuarios sin exponer los hashes', async () => {
      await createPatient(prisma);
      const token = await adminToken();

      const res = await withToken(http().get(apiPath('/users')), token);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).not.toHaveProperty('passwordHash');
    });

    it('edita el email y el perfil de un paciente', async () => {
      const patient = await createPatient(prisma);
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/users/${patient.id}`)), token).send({
        email: 'Cambiado@Mail.com',
        apellido: 'Nuevo',
      });

      expect(res.status).toBe(200);
      const inDb = await prisma.user.findUniqueOrThrow({
        where: { id: patient.id },
        include: { patient: true },
      });
      expect(inDb.email).toBe('cambiado@mail.com');
      expect(inDb.patient!.apellido).toBe('Nuevo');
    });

    it('no permite cambiar el rol: el campo se rechaza', async () => {
      const patient = await createPatient(prisma);
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/users/${patient.id}`)), token).send({
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      const inDb = await prisma.user.findUniqueOrThrow({ where: { id: patient.id } });
      expect(inDb.role).toBe('PACIENTE');
    });

    it('rechaza un campo de perfil que no aplica al rol', async () => {
      const patient = await createPatient(prisma);
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath(`/users/${patient.id}`)), token).send({
        especialidad: 'General',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('CAMPO_NO_APLICABLE_AL_ROL');
    });

    it('responde 404 si el usuario no existe', async () => {
      const token = await adminToken();

      const res = await withToken(http().get(apiPath(`/users/${MISSING_ID}`)), token);

      expect(res.status).toBe(404);
    });
  });

  describe('cuenta deshabilitada', () => {
    it('pierde el acceso al instante, con el token que ya tenía', async () => {
      const patient = await createPatient(prisma);
      const patientToken = await loginAs(app, patient);
      const admin = await adminToken();
      await withToken(http().get(apiPath('/users/me')), patientToken).expect(200);

      const change = await withToken(
        http().patch(apiPath(`/users/${patient.id}/estado`)),
        admin,
      ).send({ activo: false });

      expect(change.status).toBe(200);
      const after = await withToken(http().get(apiPath('/users/me')), patientToken);
      expect(after.status).toBe(401);
    });

    it('no puede volver a iniciar sesión', async () => {
      const patient = await createPatient(prisma);
      await prisma.user.update({ where: { id: patient.id }, data: { activo: false } });

      const res = await http()
        .post(apiPath('/auth/login'))
        .send({ email: patient.email, password: patient.password });

      expect(res.status).toBe(401);
    });

    it('recupera el acceso al habilitarla de nuevo', async () => {
      const patient = await createPatient(prisma);
      const admin = await adminToken();
      await prisma.user.update({ where: { id: patient.id }, data: { activo: false } });

      await withToken(http().patch(apiPath(`/users/${patient.id}/estado`)), admin)
        .send({ activo: true })
        .expect(200);

      const res = await http()
        .post(apiPath('/auth/login'))
        .send({ email: patient.email, password: patient.password });
      expect(res.status).toBe(200);
    });

    it('un ADMIN no puede deshabilitar su propia cuenta', async () => {
      const admin = await createAdmin(prisma);
      const token = await loginAs(app, admin);

      const res = await withToken(http().patch(apiPath(`/users/${admin.id}/estado`)), token).send({
        activo: false,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OPERACION_SOBRE_PROPIA_CUENTA');
      const inDb = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
      expect(inDb.activo).toBe(true);
    });
  });

  describe('mi cuenta', () => {
    it('devuelve mis datos sin el hash', async () => {
      const patient = await createPatient(prisma, { nombre: 'Ana', apellido: 'Pérez' });
      const token = await loginAs(app, patient);

      const res = await withToken(http().get(apiPath('/users/me')), token);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: patient.id, nombre: 'Ana Pérez' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('un paciente edita su nombre, apellido y teléfono', async () => {
      const patient = await createPatient(prisma);
      const token = await loginAs(app, patient);

      const res = await withToken(http().patch(apiPath('/users/me')), token).send({
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: '70000000',
      });

      expect(res.status).toBe(200);
      const inDb = await prisma.patient.findUniqueOrThrow({ where: { userId: patient.id } });
      expect(inDb).toMatchObject({ nombre: 'Ana', apellido: 'Pérez', telefono: '70000000' });
    });

    it('un odontólogo edita su nombre pero no su especialidad', async () => {
      const dentist = await createDentist(prisma, { especialidad: 'General' });
      const token = await loginAs(app, dentist);

      const name = await withToken(http().patch(apiPath('/users/me')), token).send({
        nombre: 'Dra. Laura',
      });
      const specialty = await withToken(http().patch(apiPath('/users/me')), token).send({
        especialidad: 'Ortodoncia',
      });

      expect(name.status).toBe(200);
      expect(specialty.status).toBe(400);
      const inDb = await prisma.dentist.findUniqueOrThrow({ where: { userId: dentist.id } });
      expect(inDb).toMatchObject({ nombre: 'Dra. Laura', especialidad: 'General' });
    });

    it('un ADMIN no tiene perfil que editar', async () => {
      const token = await adminToken();

      const res = await withToken(http().patch(apiPath('/users/me')), token).send({
        nombre: 'Admin',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('cambiar contraseña', () => {
    it('con la actual correcta la cambia y persiste el nuevo hash', async () => {
      const patient = await createPatient(prisma);
      const token = await loginAs(app, patient);

      const res = await withToken(http().patch(apiPath('/users/me/password')), token).send({
        passwordActual: patient.password,
        passwordNueva: 'otra-secreta456',
      });

      expect(res.status).toBe(204);
      const inDb = await prisma.user.findUniqueOrThrow({ where: { id: patient.id } });
      expect(await compare('otra-secreta456', inDb.passwordHash)).toBe(true);
      await http()
        .post(apiPath('/auth/login'))
        .send({ email: patient.email, password: 'otra-secreta456' })
        .expect(200);
    });

    it('con la actual incorrecta responde 400 y conserva la anterior', async () => {
      const patient = await createPatient(prisma);
      const token = await loginAs(app, patient);

      const res = await withToken(http().patch(apiPath('/users/me/password')), token).send({
        passwordActual: 'equivocada',
        passwordNueva: 'otra-secreta456',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('PASSWORD_ACTUAL_INCORRECTA');
      const inDb = await prisma.user.findUniqueOrThrow({ where: { id: patient.id } });
      expect(await compare(patient.password, inDb.passwordHash)).toBe(true);
    });

    it('responde 400 con una contraseña nueva demasiado corta', async () => {
      const patient = await createPatient(prisma);
      const token = await loginAs(app, patient);

      const res = await withToken(http().patch(apiPath('/users/me/password')), token).send({
        passwordActual: patient.password,
        passwordNueva: 'corta',
      });

      expect(res.status).toBe(400);
    });
  });
});
