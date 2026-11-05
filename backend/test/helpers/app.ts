import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/app.setup';
import { Clock } from '../../src/common/time/clock';

// Levanta la app real (mismos pipes, filtros y guards que producción) para tests de integración.
// Con `ahora` fija la hora actual, para que las reglas que dependen de ella sean deterministas.
export async function createTestApp(options: { ahora?: Date } = {}): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const { ahora } = options;
  if (ahora) {
    builder.overrideProvider(Clock).useValue({ now: () => ahora });
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}
