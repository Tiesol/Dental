import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/app.setup';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

export async function truncateAll(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}

export async function createUser(
  prisma: PrismaClient,
  data: { email: string; password: string; role: Role },
) {
  return prisma.user.create({
    data: {
      email: data.email,
      fullName: 'Usuario de prueba',
      role: data.role,
      passwordHash: await hash(data.password, 4),
    },
  });
}
