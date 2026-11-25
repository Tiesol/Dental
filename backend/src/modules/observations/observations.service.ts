import { Injectable } from '@nestjs/common';
import { CurrentUserData } from '../../common/types/current-user';
import { AppointmentsService } from '../appointments/appointments.service';
import { assertCanRegisterObservation } from './domain/observation-rules';
import { ObservationsRepository } from './observations.repository';

// Observación de atención: la registra el odontólogo asignado durante la cita.
@Injectable()
export class ObservationsService {
  constructor(
    private readonly observations: ObservationsRepository,
    private readonly appointments: AppointmentsService,
  ) {}

  async register(
    appointmentId: string,
    text: string,
    user: CurrentUserData,
  ): Promise<{ texto: string; createdAt: Date }> {
    const appointment = await this.appointments.findOne(appointmentId, user);
    assertCanRegisterObservation(appointment);
    return this.observations.create(appointmentId, text.trim());
  }
}
