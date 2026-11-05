import { Injectable } from '@nestjs/common';
import { CurrentUserData } from '../../common/types/current-user';
import { AppointmentsService } from '../appointments/appointments.service';
import { assertPuedeRegistrarObservacion } from './domain/observation-rules';
import { ObservationsRepository } from './observations.repository';

// Observación de atención: la registra el odontólogo asignado durante la cita.
@Injectable()
export class ObservationsService {
  constructor(
    private readonly observations: ObservationsRepository,
    private readonly appointments: AppointmentsService,
  ) {}

  async registrar(
    appointmentId: string,
    texto: string,
    user: CurrentUserData,
  ): Promise<{ texto: string; createdAt: Date }> {
    const cita = await this.appointments.findOne(appointmentId, user);
    assertPuedeRegistrarObservacion(cita);
    return this.observations.create(appointmentId, texto.trim());
  }
}
