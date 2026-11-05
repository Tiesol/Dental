import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { DentistsModule } from './modules/dentists/dentists.module';
import { ServicesModule } from './modules/services/services.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límite de intentos para login y registro. Solo se aplica en las rutas que usan
    // ThrottlerGuard (ver auth.controller.ts). Se desactiva en los tests (Jest define
    // NODE_ENV=test), que hacen muchos logins seguidos desde la misma IP.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: config.get<number>('AUTH_THROTTLE_LIMIT', 10) }],
        errorMessage: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
        skipIf: () => process.env.NODE_ENV === 'test',
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    DentistsModule,
    AvailabilityModule,
  ],
  providers: [
    // Guards globales: primero autenticación, luego autorización por rol.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
