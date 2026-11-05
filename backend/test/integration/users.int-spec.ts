import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { conToken, loginComo, ruta } from '../helpers/auth';
import { resetDb } from '../helpers/db';
import { crearAdmin, crearOdontologo, crearPaciente } from '../helpers/factories';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

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
  const tokenDeAdmin = async () => loginComo(app, await crearAdmin(prisma));

  describe('rutas protegidas', () => {
    const rutasDeAdmin = [
      ['get', '/users'],
      ['post', '/users'],
      ['get', `/users/${ID_INEXISTENTE}`],
      ['patch', `/users/${ID_INEXISTENTE}`],
      ['patch', `/users/${ID_INEXISTENTE}/estado`],
    ] as const;
    const rutasPropias = [
      ['get', '/users/me'],
      ['patch', '/users/me'],
      ['patch', '/users/me/password'],
    ] as const;

    it.each([...rutasDeAdmin, ...rutasPropias])(
      '%s %s responde 401 sin token',
      async (metodo, path) => {
        const res = await http()[metodo](ruta(path));

        expect(res.status).toBe(401);
      },
    );

    it.each(rutasDeAdmin)('%s %s responde 403 a un PACIENTE', async (metodo, path) => {
      const token = await loginComo(app, await crearPaciente(prisma));

      const res = await conToken(http()[metodo](ruta(path)), token);

      expect(res.status).toBe(403);
    });

    it.each(rutasDeAdmin)('%s %s responde 403 a un ODONTOLOGO', async (metodo, path) => {
      const token = await loginComo(app, await crearOdontologo(prisma));

      const res = await conToken(http()[metodo](ruta(path)), token);

      expect(res.status).toBe(403);
    });
  });

  describe('gestión por el ADMIN', () => {
    it('crea un ODONTOLOGO con su perfil, sin devolver el hash', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/users')), token).send({
        email: 'Nueva@Clinica.com',
        password: 'secreta123',
        role: 'ODONTOLOGO',
        nombre: 'Dra. Nueva',
        especialidad: 'General',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'nueva@clinica.com', role: 'ODONTOLOGO' });
      expect(res.body).not.toHaveProperty('passwordHash');
      const enBd = await prisma.user.findUniqueOrThrow({
        where: { email: 'nueva@clinica.com' },
        include: { dentist: true },
      });
      expect(enBd.dentist).toMatchObject({ nombre: 'Dra. Nueva', especialidad: 'General' });
    });

    it('crea otro ADMIN, que no tiene perfil', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/users')), token).send({
        email: 'otro@clinica.com',
        password: 'secreta123',
        role: 'ADMIN',
      });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('ADMIN');
    });

    it('rechaza crear un PACIENTE: se registran solos', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/users')), token).send({
        email: 'paciente@mail.com',
        password: 'secreta123',
        role: 'PACIENTE',
      });

      expect(res.status).toBe(400);
    });

    it('rechaza un ODONTOLOGO sin nombre ni especialidad', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/users')), token).send({
        email: 'nueva@clinica.com',
        password: 'secreta123',
        role: 'ODONTOLOGO',
      });

      expect(res.status).toBe(400);
    });

    it('responde 409 con un email ya registrado', async () => {
      await crearPaciente(prisma, { email: 'repetido@mail.com' });
      const token = await tokenDeAdmin();

      const res = await conToken(http().post(ruta('/users')), token).send({
        email: 'REPETIDO@mail.com',
        password: 'secreta123',
        role: 'ADMIN',
      });

      expect(res.status).toBe(409);
    });

    it('lista los usuarios sin exponer los hashes', async () => {
      await crearPaciente(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().get(ruta('/users')), token);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).not.toHaveProperty('passwordHash');
    });

    it('edita el email y el perfil de un paciente', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/users/${paciente.id}`)), token).send({
        email: 'Cambiado@Mail.com',
        apellido: 'Nuevo',
      });

      expect(res.status).toBe(200);
      const enBd = await prisma.user.findUniqueOrThrow({
        where: { id: paciente.id },
        include: { patient: true },
      });
      expect(enBd.email).toBe('cambiado@mail.com');
      expect(enBd.patient!.apellido).toBe('Nuevo');
    });

    it('no permite cambiar el rol: el campo se rechaza', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/users/${paciente.id}`)), token).send({
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      const enBd = await prisma.user.findUniqueOrThrow({ where: { id: paciente.id } });
      expect(enBd.role).toBe('PACIENTE');
    });

    it('rechaza un campo de perfil que no aplica al rol', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta(`/users/${paciente.id}`)), token).send({
        especialidad: 'General',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('CAMPO_NO_APLICABLE_AL_ROL');
    });

    it('responde 404 si el usuario no existe', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().get(ruta(`/users/${ID_INEXISTENTE}`)), token);

      expect(res.status).toBe(404);
    });
  });

  describe('cuenta deshabilitada', () => {
    it('pierde el acceso al instante, con el token que ya tenía', async () => {
      const paciente = await crearPaciente(prisma);
      const tokenPaciente = await loginComo(app, paciente);
      const admin = await tokenDeAdmin();
      await conToken(http().get(ruta('/users/me')), tokenPaciente).expect(200);

      const cambio = await conToken(http().patch(ruta(`/users/${paciente.id}/estado`)), admin).send(
        { activo: false },
      );

      expect(cambio.status).toBe(200);
      const despues = await conToken(http().get(ruta('/users/me')), tokenPaciente);
      expect(despues.status).toBe(401);
    });

    it('no puede volver a iniciar sesión', async () => {
      const paciente = await crearPaciente(prisma);
      await prisma.user.update({ where: { id: paciente.id }, data: { activo: false } });

      const res = await http()
        .post(ruta('/auth/login'))
        .send({ email: paciente.email, password: paciente.password });

      expect(res.status).toBe(401);
    });

    it('recupera el acceso al habilitarla de nuevo', async () => {
      const paciente = await crearPaciente(prisma);
      const admin = await tokenDeAdmin();
      await prisma.user.update({ where: { id: paciente.id }, data: { activo: false } });

      await conToken(http().patch(ruta(`/users/${paciente.id}/estado`)), admin)
        .send({ activo: true })
        .expect(200);

      const res = await http()
        .post(ruta('/auth/login'))
        .send({ email: paciente.email, password: paciente.password });
      expect(res.status).toBe(200);
    });

    it('un ADMIN no puede deshabilitar su propia cuenta', async () => {
      const admin = await crearAdmin(prisma);
      const token = await loginComo(app, admin);

      const res = await conToken(http().patch(ruta(`/users/${admin.id}/estado`)), token).send({
        activo: false,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OPERACION_SOBRE_PROPIA_CUENTA');
      const enBd = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
      expect(enBd.activo).toBe(true);
    });
  });

  describe('mi cuenta', () => {
    it('devuelve mis datos sin el hash', async () => {
      const paciente = await crearPaciente(prisma, { nombre: 'Ana', apellido: 'Pérez' });
      const token = await loginComo(app, paciente);

      const res = await conToken(http().get(ruta('/users/me')), token);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: paciente.id, nombre: 'Ana Pérez' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('un paciente edita su nombre, apellido y teléfono', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await loginComo(app, paciente);

      const res = await conToken(http().patch(ruta('/users/me')), token).send({
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: '70000000',
      });

      expect(res.status).toBe(200);
      const enBd = await prisma.patient.findUniqueOrThrow({ where: { userId: paciente.id } });
      expect(enBd).toMatchObject({ nombre: 'Ana', apellido: 'Pérez', telefono: '70000000' });
    });

    it('un odontólogo edita su nombre pero no su especialidad', async () => {
      const odontologo = await crearOdontologo(prisma, { especialidad: 'General' });
      const token = await loginComo(app, odontologo);

      const nombre = await conToken(http().patch(ruta('/users/me')), token).send({
        nombre: 'Dra. Laura',
      });
      const especialidad = await conToken(http().patch(ruta('/users/me')), token).send({
        especialidad: 'Ortodoncia',
      });

      expect(nombre.status).toBe(200);
      expect(especialidad.status).toBe(400);
      const enBd = await prisma.dentist.findUniqueOrThrow({ where: { userId: odontologo.id } });
      expect(enBd).toMatchObject({ nombre: 'Dra. Laura', especialidad: 'General' });
    });

    it('un ADMIN no tiene perfil que editar', async () => {
      const token = await tokenDeAdmin();

      const res = await conToken(http().patch(ruta('/users/me')), token).send({ nombre: 'Admin' });

      expect(res.status).toBe(400);
    });
  });

  describe('cambiar contraseña', () => {
    it('con la actual correcta la cambia y persiste el nuevo hash', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await loginComo(app, paciente);

      const res = await conToken(http().patch(ruta('/users/me/password')), token).send({
        passwordActual: paciente.password,
        passwordNueva: 'otra-secreta456',
      });

      expect(res.status).toBe(204);
      const enBd = await prisma.user.findUniqueOrThrow({ where: { id: paciente.id } });
      expect(await compare('otra-secreta456', enBd.passwordHash)).toBe(true);
      await http()
        .post(ruta('/auth/login'))
        .send({ email: paciente.email, password: 'otra-secreta456' })
        .expect(200);
    });

    it('con la actual incorrecta responde 400 y conserva la anterior', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await loginComo(app, paciente);

      const res = await conToken(http().patch(ruta('/users/me/password')), token).send({
        passwordActual: 'equivocada',
        passwordNueva: 'otra-secreta456',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('PASSWORD_ACTUAL_INCORRECTA');
      const enBd = await prisma.user.findUniqueOrThrow({ where: { id: paciente.id } });
      expect(await compare(paciente.password, enBd.passwordHash)).toBe(true);
    });

    it('responde 400 con una contraseña nueva demasiado corta', async () => {
      const paciente = await crearPaciente(prisma);
      const token = await loginComo(app, paciente);

      const res = await conToken(http().patch(ruta('/users/me/password')), token).send({
        passwordActual: paciente.password,
        passwordNueva: 'corta',
      });

      expect(res.status).toBe(400);
    });
  });
});
