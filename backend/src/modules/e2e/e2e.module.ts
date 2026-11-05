import { Module } from '@nestjs/common';
import { PasswordHasher } from '../../common/security/password-hasher';
import { E2eOnlyGuard } from './e2e-only.guard';
import { E2eController } from './e2e.controller';
import { E2eRepository } from './e2e.repository';
import { E2eService } from './e2e.service';

// Seed de los E2E de Playwright. Sus rutas solo existen con NODE_ENV=test (E2eOnlyGuard).
@Module({
  controllers: [E2eController],
  providers: [E2eService, E2eRepository, E2eOnlyGuard, PasswordHasher],
})
export class E2eModule {}
