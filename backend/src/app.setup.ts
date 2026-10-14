import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainErrorFilter } from './common/filters/domain-error.filter';

export const API_PREFIX = 'api/v1';

// Configuración compartida por main.ts y los tests de integración,
// para que las pruebas ejerciten exactamente la misma app que producción.
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' });
}
