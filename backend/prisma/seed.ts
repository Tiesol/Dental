import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Datos mínimos para desarrollo: un ADMIN y un ODONTOLOGO.
// Los pacientes se registran desde el frontend o con POST /api/v1/auth/register.
const prisma = new PrismaClient();

const timeRange = (from: number, until: number): [number, number] => [from * 60, until * 60];

function nextFridayUtc(utcHour: number): Date {
  const date = new Date();
  const FRIDAY = 5;
  const daysUntilFriday = (FRIDAY - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilFriday);
  date.setUTCHours(utcHour, 0, 0, 0);
  return date;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      role: 'ADMIN',
      passwordHash: await hash('Admin12345', 10),
    },
  });

  const dentist = await prisma.user.upsert({
    where: { email: 'odontologo@clinica.com' },
    update: {},
    create: {
      email: 'odontologo@clinica.com',
      role: 'ODONTOLOGO',
      passwordHash: await hash('Odontologo12345', 10),
      dentist: {
        create: { nombre: 'Dra. Laura Gómez', especialidad: 'Odontología general' },
      },
    },
  });

  // Catálogo inicial con los ejemplos del PDF (sección 3). Precios referenciales opcionales.
  const services = [
    {
      nombre: 'Limpieza dental',
      descripcion: 'Profilaxis y eliminación de sarro y placa bacteriana.',
      duracionMin: 30,
      precioReferencial: 150,
    },
    {
      nombre: 'Consulta y diagnóstico',
      descripcion: 'Evaluación general de la salud bucal y plan de tratamiento.',
      duracionMin: 30,
      precioReferencial: 100,
    },
    {
      nombre: 'Ortodoncia',
      descripcion: 'Control y ajuste de tratamiento de ortodoncia.',
      duracionMin: 45,
      precioReferencial: null,
    },
    {
      nombre: 'Extracción dental',
      descripcion: 'Extracción simple de una pieza dental.',
      duracionMin: 60,
      precioReferencial: 250,
    },
    {
      nombre: 'Blanqueamiento',
      descripcion: 'Blanqueamiento dental en consultorio.',
      duracionMin: 90,
      precioReferencial: 600,
    },
  ];
  for (const service of services) {
    await prisma.service.upsert({
      where: { nombre: service.nombre },
      update: {},
      create: service,
    });
  }

  // Segundo odontólogo, para tener con quién comparar al filtrar por servicio.
  const orthodontist = await prisma.user.upsert({
    where: { email: 'ortodoncista@clinica.com' },
    update: {},
    create: {
      email: 'ortodoncista@clinica.com',
      role: 'ODONTOLOGO',
      passwordHash: await hash('Odontologo12345', 10),
      dentist: { create: { nombre: 'Dr. Carlos Rojas', especialidad: 'Ortodoncia' } },
    },
  });

  // Servicios que realiza cada odontólogo (PDF sección 4). upsert: el seed se puede repetir.
  const assignments: Record<string, string[]> = {
    [dentist.id]: ['Limpieza dental', 'Consulta y diagnóstico', 'Extracción dental'],
    [orthodontist.id]: ['Consulta y diagnóstico', 'Ortodoncia', 'Blanqueamiento'],
  };
  for (const [userId, names] of Object.entries(assignments)) {
    const dentist = await prisma.dentist.findUniqueOrThrow({ where: { userId } });
    for (const name of names) {
      const service = await prisma.service.findUniqueOrThrow({ where: { nombre: name } });
      await prisma.dentistService.upsert({
        where: { dentistId_serviceId: { dentistId: dentist.id, serviceId: service.id } },
        update: {},
        create: { dentistId: dentist.id, serviceId: service.id },
      });
    }
  }

  // Horarios de atención en minutos desde las 00:00 en la zona de la clínica (PDF sección 5).
  const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5];
  const schedule: Record<string, { days: number[]; timeRanges: [number, number][] }> = {
    [dentist.id]: { days: MONDAY_TO_FRIDAY, timeRanges: [timeRange(8, 12), timeRange(14, 18)] },
    [orthodontist.id]: { days: [1, 3, 5], timeRanges: [timeRange(9, 13), timeRange(15, 19)] },
  };
  for (const [userId, { days, timeRanges }] of Object.entries(schedule)) {
    const dentist = await prisma.dentist.findUniqueOrThrow({ where: { userId } });
    if ((await prisma.availabilityRule.count({ where: { dentistId: dentist.id } })) > 0) continue;
    await prisma.availabilityRule.createMany({
      data: days.flatMap((weekday) =>
        timeRanges.map(([startMinute, endMinute]) => ({
          dentistId: dentist.id,
          diaSemana: weekday,
          minutoInicio: startMinute,
          minutoFin: endMinute,
        })),
      ),
    });
  }

  // Un bloque no disponible de ejemplo: el próximo viernes de 10:00 a 11:00 (La Paz, UTC-4).
  const laura = await prisma.dentist.findUniqueOrThrow({ where: { userId: dentist.id } });
  if ((await prisma.unavailableBlock.count({ where: { dentistId: laura.id } })) === 0) {
    const start = nextFridayUtc(14);
    await prisma.unavailableBlock.create({
      data: {
        dentistId: laura.id,
        inicio: start,
        fin: new Date(start.getTime() + 60 * 60 * 1000),
        motivo: 'Reunión de equipo',
      },
    });
  }

  console.log(
    `Seed listo: ${admin.email}, ${dentist.email}, ${orthodontist.email}, ` +
      `${services.length} servicios y horarios de atención`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
