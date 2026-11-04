import { Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module';
import { UsersModule } from '../users/users.module';
import { DentistsController } from './dentists.controller';
import { DentistsRepository } from './dentists.repository';
import { DentistsService } from './dentists.service';

// Odontólogos: registro, datos profesionales, servicios que realizan y habilitación (ADMIN);
// consulta de los que aceptan citas (pacientes). Exporta solo el service.
@Module({
  imports: [UsersModule, ServicesModule],
  controllers: [DentistsController],
  providers: [DentistsService, DentistsRepository],
  exports: [DentistsService],
})
export class DentistsModule {}
