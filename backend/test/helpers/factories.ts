import { AppointmentStatus, PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Factories para tests de integración: crean filas reales con valores por defecto sensatos.

let counter = 0;
const next = () => ++counter;

export async function createPatient(
  prisma: PrismaClient,
  overrides: { email?: string; password?: string; nombre?: string; apellido?: string } = {},
) {
  const n = next();
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

export async function createDentist(
  prisma: PrismaClient,
  overrides: { email?: string; password?: string; nombre?: string; especialidad?: string } = {},
) {
  const n = next();
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

export async function createAdmin(
  prisma: PrismaClient,
  overrides: { email?: string; password?: string } = {},
) {
  const n = next();
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

export async function createService(
  prisma: PrismaClient,
  overrides: { nombre?: string; duracionMin?: number } = {},
) {
  return prisma.service.create({
    data: {
      nombre: overrides.nombre ?? `Servicio ${next()}`,
      descripcion: 'Servicio de prueba',
      duracionMin: overrides.duracionMin ?? 30,
    },
  });
}

// Crea una cita directamente en la BD, con un paciente y un servicio nuevos.
export async function createAppointment(
  prisma: PrismaClient,
  data: {
    dentistId: string;
    horaInicio: Date;
    horaFin: Date;
    estado?: AppointmentStatus;
  },
) {
  const patient = await createPatient(prisma);
  const service = await createService(prisma);
  return prisma.appointment.create({
    data: {
      ...data,
      patientId: patient.patient!.id,
      serviceId: service.id,
    },
  });
}
