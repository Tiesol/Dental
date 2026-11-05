import { PrismaClient } from '@prisma/client';

// Vacía todas las tablas (menos la de migraciones) para que cada test arranque limpio.
export async function resetDb(prisma: PrismaClient) {
  // Sin .env.test, Prisma se conectaría a la base de desarrollo: mejor fallar que vaciarla.
  const [{ nombre }] = await prisma.$queryRaw<{ nombre: string }[]>`
    SELECT current_database() AS nombre`;
  if (!nombre.endsWith('_test')) {
    throw new Error(`Los tests no vacían la base "${nombre}". ¿Falta backend/.env.test?`);
  }
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) {
    return;
  }
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}
