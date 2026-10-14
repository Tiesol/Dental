import { PublicUser, UserRecord } from './user';

export const NOMBRE_ADMIN = 'Administrador';

// Nombre para mostrar según el perfil: paciente "Nombre Apellido", odontólogo su nombre,
// administrador un rótulo fijo (el PDF no exige datos personales del admin).
export function nombreParaMostrar(user: UserRecord): string {
  if (user.patient) {
    return `${user.patient.nombre} ${user.patient.apellido}`.trim();
  }
  if (user.dentist) {
    return user.dentist.nombre;
  }
  return NOMBRE_ADMIN;
}

// Proyección pública del usuario: sin passwordHash, con nombre e ids de perfil.
export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    activo: user.activo,
    createdAt: user.createdAt,
    nombre: nombreParaMostrar(user),
    ...(user.patient ? { patientId: user.patient.id } : {}),
    ...(user.dentist ? { dentistId: user.dentist.id } : {}),
  };
}
