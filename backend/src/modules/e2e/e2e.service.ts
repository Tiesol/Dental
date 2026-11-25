import { Injectable } from '@nestjs/common';
import { NotATestDatabaseError } from '../../common/errors/domain-error';
import { PasswordHasher } from '../../common/security/password-hasher';
import { calculateEndTime } from '../appointments/domain/end-time';
import { CreateE2eAppointmentDto } from './dto/create-e2e-appointment.dto';
import { E2eRepository } from './e2e.repository';

// Lunes a viernes, de 09:00 a 12:00 en la zona de la clínica.
const SCHEDULE = [1, 2, 3, 4, 5].map((weekday) => ({
  diaSemana: weekday,
  minutoInicio: 540,
  minutoFin: 720,
}));

// Datos conocidos que los escenarios de frontend/e2e/ dan por sentados.
@Injectable()
export class E2eService {
  constructor(
    private readonly e2e: E2eRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async seed(): Promise<void> {
    // Sin .env.test, start:test se conectaría a la base de desarrollo: NODE_ENV no basta.
    const base = await this.e2e.databaseName();
    if (!base.endsWith('_test')) {
      throw new NotATestDatabaseError(base);
    }
    await this.e2e.wipe();
    const adminKey = await this.hasher.hash('Admin12345');
    const patientKey = await this.hasher.hash('Paciente12345');
    const dentistKey = await this.hasher.hash('Odontologo12345');

    await this.e2e.createAdmin('admin@e2e.com', adminKey);
    await this.e2e.createPatient({
      email: 'paciente1@e2e.com',
      passwordHash: patientKey,
      nombre: 'Ana',
      apellido: 'Pérez',
    });
    await this.e2e.createPatient({
      email: 'paciente2@e2e.com',
      passwordHash: patientKey,
      nombre: 'Bruno',
      apellido: 'Rojas',
    });
    const cleaning = await this.e2e.createService({
      nombre: 'Limpieza dental',
      descripcion: 'Profilaxis y eliminación de sarro',
      duracionMin: 30,
      activo: true,
    });
    const consultation = await this.e2e.createService({
      nombre: 'Consulta y diagnóstico',
      descripcion: 'Revisión general',
      duracionMin: 60,
      activo: true,
    });
    await this.e2e.createService({
      nombre: 'Blanqueamiento',
      descripcion: 'Servicio deshabilitado',
      duracionMin: 45,
      activo: false,
    });
    await this.e2e.createDentist({
      email: 'odontologo@e2e.com',
      passwordHash: dentistKey,
      nombre: 'Dra. Laura Gómez',
      especialidad: 'Odontología general',
      serviceIds: [cleaning, consultation],
      schedule: SCHEDULE,
    });
  }

  createAppointment(dto: CreateE2eAppointmentDto): Promise<{ id: string }> {
    const startsAt = new Date(dto.horaInicio);
    return this.e2e.createAppointment({
      patientEmail: `${dto.paciente}@e2e.com`,
      serviceName: 'Limpieza dental',
      horaInicio: startsAt,
      horaFin: (durationMin) => calculateEndTime(startsAt, durationMin),
      estado: dto.estado ?? 'PENDIENTE',
      observation: dto.observacion,
    });
  }
}
