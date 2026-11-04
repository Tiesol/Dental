import { Module } from '@nestjs/common';
import { PasswordHasher } from '../../common/security/password-hasher';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

// Usuario base (login + rol) y sus perfiles: gestión por el ADMIN y cuenta propia.
// Exporta solo el service.
@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PasswordHasher],
  exports: [UsersService],
})
export class UsersModule {}
