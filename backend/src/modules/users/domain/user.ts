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

// Usuario público más los datos de su perfil, para las pantallas de gestión.
export type UserDetail = PublicUser & {
  paciente: { nombre: string; apellido: string; telefono: string | null } | null;
  odontologo: { nombre: string; especialidad: string; activo: boolean } | null;
};

export type NewPatientUser = {
  email: string;
  passwordHash: string;
  nombre: string;
  apellido: string;
  telefono?: string;
};

// Roles que solo puede crear un ADMIN (los pacientes se registran solos).
export const STAFF_ROLES = ['ODONTOLOGO', 'ADMIN'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type NewStaffUser =
  | { role: 'ADMIN'; email: string; passwordHash: string }
  | {
      role: 'ODONTOLOGO';
      email: string;
      passwordHash: string;
      nombre: string;
      especialidad: string;
    };

// Campos de perfil que se pueden editar. Cuáles aplican depende del rol (ver profile-changes.ts).
export type ProfileFields = {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  especialidad?: string;
};

// Cambios ya validados contra el rol, listos para persistir.
export type UserChanges = {
  email?: string;
  patient?: { nombre?: string; apellido?: string; telefono?: string | null };
  dentist?: { nombre?: string; especialidad?: string };
};
