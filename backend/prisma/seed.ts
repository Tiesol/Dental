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

  console.log(`Seed listo: ${admin.email}, ${odontologo.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
