import { Module } from '@nestjs/common';
import { Clock } from '../../common/time/clock';
import { AvailabilityModule } from '../availability/availability.module';
import { AgendaController } from './agenda.controller';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

// Citas: reservar, consultar, reprogramar, cancelar y cambiar de estado. Exporta solo el service.
@Module({
  imports: [AvailabilityModule],
  controllers: [AppointmentsController, AgendaController],
  providers: [AppointmentsService, AppointmentsRepository, Clock],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
