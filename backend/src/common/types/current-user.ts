import { Role } from './role';

// Datos del usuario autenticado que viajan en request.user (los llena JwtStrategy).
// patientId / dentistId permiten verificar propiedad sin consultar la BD en cada petición.
export type CurrentUserData = {
  userId: string;
  email: string;
  role: Role;
  patientId?: string;
  dentistId?: string;
};
