import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Datos mínimos para desarrollo: un ADMIN y un ODONTOLOGO.
// Los pacientes se registran desde el frontend o con POST /api/v1/auth/register.
const prisma = new PrismaClient();

const tramo = (desde: number, hasta: number): [number, number] => [desde * 60, hasta * 60];

function proximoViernesUtc(horaUtc: number): Date {
  const fecha = new Date();
  const VIERNES = 5;
  const diasHastaViernes = (VIERNES - fecha.getUTCDay() + 7) % 7 || 7;
  fecha.setUTCDate(fecha.getUTCDate() + diasHastaViernes);
  fecha.setUTCHours(horaUtc, 0, 0, 0);
  return fecha;
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

  const odontologo = await prisma.user.upsert({
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
  const servicios = [
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
  for (const servicio of servicios) {
    await prisma.service.upsert({
      where: { nombre: servicio.nombre },
      update: {},
      create: servicio,
    });
  }

  // Segundo odontólogo, para tener con quién comparar al filtrar por servicio.
  const ortodoncista = await prisma.user.upsert({
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
  const asignaciones: Record<string, string[]> = {
    [odontologo.id]: ['Limpieza dental', 'Consulta y diagnóstico', 'Extracción dental'],
    [ortodoncista.id]: ['Consulta y diagnóstico', 'Ortodoncia', 'Blanqueamiento'],
  };
  for (const [userId, nombres] of Object.entries(asignaciones)) {
    const dentist = await prisma.dentist.findUniqueOrThrow({ where: { userId } });
    for (const nombre of nombres) {
      const service = await prisma.service.findUniqueOrThrow({ where: { nombre } });
      await prisma.dentistService.upsert({
        where: { dentistId_serviceId: { dentistId: dentist.id, serviceId: service.id } },
        update: {},
        create: { dentistId: dentist.id, serviceId: service.id },
      });
    }
  }

  // Horarios de atención en minutos desde las 00:00 en la zona de la clínica (PDF sección 5).
  const LUNES_A_VIERNES = [1, 2, 3, 4, 5];
  const horarios: Record<string, { dias: number[]; tramos: [number, number][] }> = {
    [odontologo.id]: { dias: LUNES_A_VIERNES, tramos: [tramo(8, 12), tramo(14, 18)] },
    [ortodoncista.id]: { dias: [1, 3, 5], tramos: [tramo(9, 13), tramo(15, 19)] },
  };
  for (const [userId, { dias, tramos }] of Object.entries(horarios)) {
    const dentist = await prisma.dentist.findUniqueOrThrow({ where: { userId } });
    if ((await prisma.availabilityRule.count({ where: { dentistId: dentist.id } })) > 0) continue;
    await prisma.availabilityRule.createMany({
      data: dias.flatMap((diaSemana) =>
        tramos.map(([minutoInicio, minutoFin]) => ({
          dentistId: dentist.id,
          diaSemana,
          minutoInicio,
          minutoFin,
        })),
      ),
    });
  }

  // Un bloque no disponible de ejemplo: el próximo viernes de 10:00 a 11:00 (La Paz, UTC-4).
  const laura = await prisma.dentist.findUniqueOrThrow({ where: { userId: odontologo.id } });
  if ((await prisma.unavailableBlock.count({ where: { dentistId: laura.id } })) === 0) {
    const inicio = proximoViernesUtc(14);
    await prisma.unavailableBlock.create({
      data: {
        dentistId: laura.id,
        inicio,
        fin: new Date(inicio.getTime() + 60 * 60 * 1000),
        motivo: 'Reunión de equipo',
      },
    });
  }

  console.log(
    `Seed listo: ${admin.email}, ${odontologo.email}, ${ortodoncista.email}, ` +
      `${servicios.length} servicios y horarios de atención`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
