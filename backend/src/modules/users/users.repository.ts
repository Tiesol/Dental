import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NewPatientUser, NewStaffUser, UserChanges, UserRecord } from './domain/user';

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

  // Crea un ODONTOLOGO (con su perfil Dentist) o un ADMIN (sin perfil).
  async createStaff(data: NewStaffUser): Promise<UserRecord> {
    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        ...(data.role === 'ODONTOLOGO'
          ? { dentist: { create: { nombre: data.nombre, especialidad: data.especialidad } } }
          : {}),
      },
      include: withProfiles,
    });
    return toRecord(row);
  }

  // Actualiza email y/o el perfil en una sola sentencia (Prisma la ejecuta en una transacción).
  async update(id: string, changes: UserChanges): Promise<UserRecord> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        ...(changes.email !== undefined ? { email: changes.email } : {}),
        ...(changes.patient ? { patient: { update: changes.patient } } : {}),
        ...(changes.dentist ? { dentist: { update: changes.dentist } } : {}),
      },
      include: withProfiles,
    });
    return toRecord(row);
  }

  async setActivo(id: string, activo: boolean): Promise<UserRecord> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { activo },
      include: withProfiles,
    });
    return toRecord(row);
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
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
