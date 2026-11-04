import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Datos mínimos para desarrollo: un ADMIN y un ODONTOLOGO.
// Los pacientes se registran desde el frontend o con POST /api/v1/auth/register.
const prisma = new PrismaClient();

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

  console.log(`Seed listo: ${admin.email}, ${odontologo.email} y ${servicios.length} servicios`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
