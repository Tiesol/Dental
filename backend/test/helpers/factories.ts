import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Factories para tests de integración: crean filas reales con valores por defecto sensatos.

let contador = 0;
const siguiente = () => ++contador;

export async function crearPaciente(
  prisma: PrismaClient,
  overrides: { email?: string; password?: string; nombre?: string; apellido?: string } = {},
) {
  const n = siguiente();
  const password = overrides.password ?? 'secreta123';
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `paciente${n}@mail.com`,
      passwordHash: await hash(password, 4),
      role: 'PACIENTE',
      patient: {
        create: { nombre: overrides.nombre ?? 'Paciente', apellido: overrides.apellido ?? `${n}` },
      },
    },
    include: { patient: true },
  });
  return { ...user, password };
}

export async function crearOdontologo(
  prisma: PrismaClient,
  overrides: { email?: string; password?: string; nombre?: string; especialidad?: string } = {},
) {
  const n = siguiente();
  const password = overrides.password ?? 'secreta123';
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `odontologo${n}@mail.com`,
      passwordHash: await hash(password, 4),
      role: 'ODONTOLOGO',
      dentist: {
        create: {
          nombre: overrides.nombre ?? `Dr. Odontólogo ${n}`,
          especialidad: overrides.especialidad ?? 'Odontología general',
        },
      },
    },
    include: { dentist: true },
  });
  return { ...user, password };
}

export async function crearAdmin(
  prisma: PrismaClient,
  overrides: { email?: string; password?: string } = {},
) {
  const n = siguiente();
  const password = overrides.password ?? 'Admin12345';
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `admin${n}@clinica.com`,
      passwordHash: await hash(password, 4),
      role: 'ADMIN',
    },
  });
  return { ...user, password };
}
