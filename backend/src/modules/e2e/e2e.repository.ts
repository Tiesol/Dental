import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentStatus } from '../appointments/domain/appointment';

// Único punto de acceso a la base para el seed de E2E.
@Injectable()
export class E2eRepository {
  constructor(private readonly prisma: PrismaService) {}

  async vaciar(): Promise<void> {
    const tablas = await this.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    const lista = tablas.map((t) => `"${t.tablename}"`).join(', ');
    await this.prisma.$executeRawUnsafe(`TRUNCATE ${lista} CASCADE`);
  }

  async crearAdmin(email: string, passwordHash: string): Promise<void> {
    await this.prisma.user.create({ data: { email, passwordHash, role: 'ADMIN' } });
  }

  async crearPaciente(datos: {
    email: string;
    passwordHash: string;
    nombre: string;
    apellido: string;
  }): Promise<void> {
    const { nombre, apellido, ...cuenta } = datos;
    await this.prisma.user.create({
      data: { ...cuenta, role: 'PACIENTE', patient: { create: { nombre, apellido } } },
    });
  }

  async crearServicio(datos: {
    nombre: string;
    descripcion: string;
    duracionMin: number;
    activo: boolean;
  }): Promise<string> {
    const { id } = await this.prisma.service.create({ data: datos });
    return id;
  }

  async crearOdontologo(datos: {
    email: string;
    passwordHash: string;
    nombre: string;
    especialidad: string;
    serviceIds: string[];
    horarios: { diaSemana: number; minutoInicio: number; minutoFin: number }[];
  }): Promise<void> {
    const { email, passwordHash, nombre, especialidad, serviceIds, horarios } = datos;
    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ODONTOLOGO',
        dentist: {
          create: {
            nombre,
            especialidad,
            services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
            availabilityRules: { create: horarios },
          },
        },
      },
    });
  }

  // La cita usa al odontólogo del seed y el servicio indicado; se salta las validaciones a
  // propósito, para poder dejar citas pasadas o en cualquier estado.
  async crearCita(datos: {
    emailPaciente: string;
    nombreServicio: string;
    horaInicio: Date;
    horaFin: (duracionMin: number) => Date;
    estado: AppointmentStatus;
    observacion?: string;
  }): Promise<{ id: string }> {
    const paciente = await this.prisma.patient.findFirstOrThrow({
      where: { user: { email: datos.emailPaciente } },
    });
    const servicio = await this.prisma.service.findUniqueOrThrow({
      where: { nombre: datos.nombreServicio },
    });
    const odontologo = await this.prisma.dentist.findFirstOrThrow();
    return this.prisma.appointment.create({
      data: {
        patientId: paciente.id,
        dentistId: odontologo.id,
        serviceId: servicio.id,
        horaInicio: datos.horaInicio,
        horaFin: datos.horaFin(servicio.duracionMin),
        estado: datos.estado,
        ...(datos.observacion ? { observation: { create: { texto: datos.observacion } } } : {}),
      },
      select: { id: true },
    });
  }
}
