import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NewPatientUser, UserRecord } from './domain/user';

const withProfiles = { patient: true, dentist: true } satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof withProfiles }>;

// Único punto de acceso a la tabla User (y sus perfiles) con Prisma.
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email }, include: withProfiles });
    return row ? toRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: withProfiles });
    return row ? toRecord(row) : null;
  }

  async findAll(): Promise<UserRecord[]> {
    const rows = await this.prisma.user.findMany({
      include: withProfiles,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  // Crea el usuario con rol PACIENTE y su perfil Patient en una sola operación.
  async createPatient(data: NewPatientUser): Promise<UserRecord> {
    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: 'PACIENTE',
        patient: {
          create: { nombre: data.nombre, apellido: data.apellido, telefono: data.telefono },
        },
      },
      include: withProfiles,
    });
    return toRecord(row);
  }
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    activo: row.activo,
    createdAt: row.createdAt,
    patient: row.patient
      ? {
          id: row.patient.id,
          nombre: row.patient.nombre,
          apellido: row.patient.apellido,
          telefono: row.patient.telefono,
        }
      : null,
    dentist: row.dentist
      ? {
          id: row.dentist.id,
          nombre: row.dentist.nombre,
          especialidad: row.dentist.especialidad,
          activo: row.dentist.activo,
        }
      : null,
  };
}
