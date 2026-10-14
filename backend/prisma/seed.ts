import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      fullName: 'Administrador',
      role: Role.ADMIN,
      passwordHash: await hash('Admin12345', 10),
    },
  });

  const dentist = await prisma.user.upsert({
    where: { email: 'dentista@clinica.com' },
    update: {},
    create: {
      email: 'dentista@clinica.com',
      fullName: 'Dra. Laura Gómez',
      role: Role.DENTIST,
      passwordHash: await hash('Dentista12345', 10),
      dentist: { create: { specialty: 'Odontología general' } },
    },
  });

  console.log(`Seed listo: ${admin.email}, ${dentist.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
