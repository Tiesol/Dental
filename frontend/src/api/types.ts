// Espejo de los DTOs y respuestas del backend (ver ../backend/ARQUITECTURA.md sección 8).
// Cuando el backend cambia un DTO, se actualiza este archivo en el mismo cambio.

export type Role = 'PACIENTE' | 'ODONTOLOGO' | 'ADMIN';

export type UserResponse = {
  id: string;
  email: string;
  role: Role;
  activo: boolean;
  createdAt: string;
  nombre: string;
  patientId?: string;
  dentistId?: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: UserResponse;
};

// ---- Gestión de usuarios (/users) ----

// Usuario con los datos de su perfil. Lo devuelven todos los endpoints de /users.
export type UserDetail = UserResponse & {
  paciente: { nombre: string; apellido: string; telefono: string | null } | null;
  odontologo: { nombre: string; especialidad: string; activo: boolean } | null;
};

// Roles que crea el ADMIN; los pacientes se registran solos.
export type StaffRole = 'ODONTOLOGO' | 'ADMIN';

export type CreateUserRequest =
  | { role: 'ADMIN'; email: string; password: string }
  | { role: 'ODONTOLOGO'; email: string; password: string; nombre: string; especialidad: string };

// El rol no se puede cambiar. Solo se envían los campos que aplican al rol del usuario.
export type UpdateUserRequest = {
  email?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  especialidad?: string;
};

export type UpdateMyProfileRequest = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
};

export type ChangePasswordRequest = {
  passwordActual: string;
  passwordNueva: string;
};
