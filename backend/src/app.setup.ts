import { INestApplication, ValidationPipe } from '@nestjs/common';

// Configuración compartida por main.ts y los tests de integración.
export function setupApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  });
}
