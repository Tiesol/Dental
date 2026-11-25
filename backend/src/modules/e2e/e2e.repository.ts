import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentStatus } from '../appointments/domain/appointment';

// Único punto de acceso a la base para el seed de E2E.
@Injectable()
export class E2eRepository {
  constructor(private readonly prisma: PrismaService) {}

  async databaseName(): Promise<string> {
    const [{ nombre: name }] = await this.prisma.$queryRaw<{ nombre: string }[]>`
      SELECT current_database() AS nombre`;
    return name;
  }

  async wipe(): Promise<void> {
    const tables = await this.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    const list = tables.map((t) => `"${t.tablename}"`).join(', ');
    await this.prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
  }

  async createAdmin(email: string, passwordHash: string): Promise<void> {
    await this.prisma.user.create({ data: { email, passwordHash, role: 'ADMIN' } });
  }

  async createPatient(data: {
    email: string;
    passwordHash: string;
    nombre: string;
    apellido: string;
  }): Promise<void> {
    const { nombre: name, apellido: lastName, ...account } = data;
    await this.prisma.user.create({
      data: {
        ...account,
        role: 'PACIENTE',
        patient: { create: { nombre: name, apellido: lastName } },
      },
    });
  }

  async createService(data: {
    nombre: string;
    descripcion: string;
    duracionMin: number;
    activo: boolean;
  }): Promise<string> {
    const { id } = await this.prisma.service.create({ data });
    return id;
  }

  async createDentist(data: {
    email: string;
    passwordHash: string;
    nombre: string;
    especialidad: string;
    serviceIds: string[];
    schedule: { diaSemana: number; minutoInicio: number; minutoFin: number }[];
  }): Promise<void> {
    const {
      email,
      passwordHash,
      nombre: name,
      especialidad: specialty,
      serviceIds,
      schedule,
    } = data;
    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ODONTOLOGO',
        dentist: {
          create: {
            nombre: name,
            especialidad: specialty,
            services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
            availabilityRules: { create: schedule },
          },
        },
      },
    });
  }

  // La cita usa al odontólogo del seed y el servicio indicado; se salta las validaciones a
  // propósito, para poder dejar citas pasadas o en cualquier estado.
  async createAppointment(data: {
    patientEmail: string;
    serviceName: string;
    horaInicio: Date;
    horaFin: (durationMin: number) => Date;
    estado: AppointmentStatus;
    observation?: string;
  }): Promise<{ id: string }> {
    const patient = await this.prisma.patient.findFirstOrThrow({
      where: { user: { email: data.patientEmail } },
    });
    const service = await this.prisma.service.findUniqueOrThrow({
      where: { nombre: data.serviceName },
    });
    const dentist = await this.prisma.dentist.findFirstOrThrow();
    return this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        dentistId: dentist.id,
        serviceId: service.id,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin(service.duracionMin),
        estado: data.estado,
        ...(data.observation ? { observation: { create: { texto: data.observation } } } : {}),
      },
      select: { id: true },
    });
  }
}
