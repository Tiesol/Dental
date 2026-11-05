import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../common/security/password-hasher';
import { calcularHoraFin } from '../appointments/domain/end-time';
import { CreateE2eAppointmentDto } from './dto/create-e2e-appointment.dto';
import { E2eRepository } from './e2e.repository';

// Lunes a viernes, de 09:00 a 12:00 en la zona de la clínica.
const HORARIOS = [1, 2, 3, 4, 5].map((diaSemana) => ({
  diaSemana,
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

  async sembrar(): Promise<void> {
    await this.e2e.vaciar();
    const claveAdmin = await this.hasher.hash('Admin12345');
    const clavePaciente = await this.hasher.hash('Paciente12345');
    const claveOdontologo = await this.hasher.hash('Odontologo12345');

    await this.e2e.crearAdmin('admin@e2e.com', claveAdmin);
    await this.e2e.crearPaciente({
      email: 'paciente1@e2e.com',
      passwordHash: clavePaciente,
      nombre: 'Ana',
      apellido: 'Pérez',
    });
    await this.e2e.crearPaciente({
      email: 'paciente2@e2e.com',
      passwordHash: clavePaciente,
      nombre: 'Bruno',
      apellido: 'Rojas',
    });
    const limpieza = await this.e2e.crearServicio({
      nombre: 'Limpieza dental',
      descripcion: 'Profilaxis y eliminación de sarro',
      duracionMin: 30,
      activo: true,
    });
    const consulta = await this.e2e.crearServicio({
      nombre: 'Consulta y diagnóstico',
      descripcion: 'Revisión general',
      duracionMin: 60,
      activo: true,
    });
    await this.e2e.crearServicio({
      nombre: 'Blanqueamiento',
      descripcion: 'Servicio deshabilitado',
      duracionMin: 45,
      activo: false,
    });
    await this.e2e.crearOdontologo({
      email: 'odontologo@e2e.com',
      passwordHash: claveOdontologo,
      nombre: 'Dra. Laura Gómez',
      especialidad: 'Odontología general',
      serviceIds: [limpieza, consulta],
      horarios: HORARIOS,
    });
  }

  crearCita(dto: CreateE2eAppointmentDto): Promise<{ id: string }> {
    const horaInicio = new Date(dto.horaInicio);
    return this.e2e.crearCita({
      emailPaciente: `${dto.paciente}@e2e.com`,
      nombreServicio: 'Limpieza dental',
      horaInicio,
      horaFin: (duracionMin) => calcularHoraFin(horaInicio, duracionMin),
      estado: dto.estado ?? 'PENDIENTE',
      observacion: dto.observacion,
    });
  }
}
