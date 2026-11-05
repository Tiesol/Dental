import { Tx } from '../../prisma/prisma.service';
import { AppointmentView, NewAppointment } from './domain/appointment';

export class AppointmentsRepository {
  withDentistLock<T>(_dentistId: string, _fn: (tx: Tx) => Promise<T>): Promise<T> {
    throw new Error('sin implementar');
  }

  create(_tx: Tx, _datos: NewAppointment): Promise<AppointmentView> {
    throw new Error('sin implementar');
  }
}
