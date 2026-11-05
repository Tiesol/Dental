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

// ---- Servicios (/services) ----

export type ServiceResponse = {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precioReferencial: number | null;
  activo: boolean;
};

export type CreateServiceRequest = {
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precioReferencial?: number | null;
  activo?: boolean;
};

// El estado se cambia aparte, con PATCH /services/:id/estado. null en el precio lo quita.
export type UpdateServiceRequest = Partial<Omit<CreateServiceRequest, 'activo'>>;

// ---- Odontólogos (/dentists) ----

// Vista del ADMIN: incluye la cuenta y todos los servicios (también los deshabilitados).
export type DentistAdminResponse = {
  id: string;
  userId: string;
  email: string;
  // Cuenta de acceso habilitada (se gestiona en /users/:id/estado).
  cuentaActiva: boolean;
  nombre: string;
  especialidad: string;
  // Profesional habilitado para nuevas citas (se gestiona en /dentists/:id/estado).
  activo: boolean;
  servicios: { id: string; nombre: string; duracionMin: number; activo: boolean }[];
};

// Vista de PACIENTE/ODONTOLOGO: solo quienes aceptan citas y solo servicios habilitados.
export type DentistPublicResponse = {
  id: string;
  nombre: string;
  especialidad: string;
  servicios: { id: string; nombre: string; duracionMin: number }[];
};

export type CreateDentistRequest = {
  email: string;
  password: string;
  nombre: string;
  especialidad: string;
  serviceIds: string[];
};

export type UpdateDentistRequest = { nombre?: string; especialidad?: string };

// ---- Disponibilidad (/dentists/:id/availability, /blocks y /slots) ----

export type AvailabilityRuleResponse = {
  id: string;
  // 0 = domingo ... 6 = sábado.
  diaSemana: number;
  // Minutos desde las 00:00 en la zona de la clínica (09:00 = 540).
  minutoInicio: number;
  minutoFin: number;
};

export type AvailabilityRuleRequest = Omit<AvailabilityRuleResponse, 'id'>;

export type UnavailableBlockResponse = {
  id: string;
  inicio: string;
  fin: string;
  // Solo lo recibe el ADMIN.
  motivo?: string | null;
};

export type AvailabilityResponse = {
  horarios: AvailabilityRuleResponse[];
  bloques: UnavailableBlockResponse[];
};

export type CreateBlockRequest = { inicio: string; fin: string; motivo?: string };

export type SlotResponse = { inicio: string; fin: string };

// ---- Citas (/appointments) ----

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'EN_ATENCION' | 'FINALIZADA' | 'CANCELADA';

export type AppointmentResponse = {
  id: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoCita;
  createdAt: string;
  servicio: { id: string; nombre: string; duracionMin: number };
  odontologo: { id: string; nombre: string; especialidad: string };
  paciente: { id: string; nombre: string; apellido: string; telefono: string | null };
  observacion: { texto: string; createdAt: string } | null;
};

// horaFin, estado y patientId los deriva el backend. horaInicio es el valor que devolvió /slots.
export type CreateAppointmentRequest = {
  dentistId: string;
  serviceId: string;
  horaInicio: string;
};

export type CuandoCitas = 'proximas' | 'historial';

export type AppointmentFiltersRequest = {
  fecha?: string;
  estado?: EstadoCita;
  dentistId?: string;
  limit?: number;
  offset?: number;
};
