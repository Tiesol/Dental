import { Module } from '@nestjs/common';
import { Clock } from '../../common/time/clock';
import { DentistsModule } from '../dentists/dentists.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityRepository } from './availability.repository';
import { AvailabilityService } from './availability.service';

// Disponibilidad de los odontólogos: horarios de atención y bloques no disponibles.
// Exporta solo el service.
@Module({
  imports: [DentistsModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository, Clock],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
