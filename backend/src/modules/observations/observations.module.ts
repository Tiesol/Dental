import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ObservationsController } from './observations.controller';
import { ObservationsRepository } from './observations.repository';
import { ObservationsService } from './observations.service';

// Observación de atención de una cita. Exporta solo el service.
@Module({
  imports: [AppointmentsModule],
  controllers: [ObservationsController],
  providers: [ObservationsService, ObservationsRepository],
  exports: [ObservationsService],
})
export class ObservationsModule {}
