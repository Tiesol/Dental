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
