import { Role } from '../../../common/types/role';

// Tipos de dominio del usuario. No dependen de Prisma: el repository mapea las filas a estas formas.

export type PatientProfile = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
};

export type DentistProfile = {
  id: string;
  nombre: string;
  especialidad: string;
  activo: boolean;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  activo: boolean;
  createdAt: Date;
  patient: PatientProfile | null;
  dentist: DentistProfile | null;
};

// Lo que la API expone de un usuario. Nunca incluye passwordHash.
export type PublicUser = {
  id: string;
  email: string;
  role: Role;
  activo: boolean;
  createdAt: Date;
  nombre: string;
  patientId?: string;
  dentistId?: string;
};

export type NewPatientUser = {
  email: string;
  passwordHash: string;
  nombre: string;
  apellido: string;
  telefono?: string;
};
