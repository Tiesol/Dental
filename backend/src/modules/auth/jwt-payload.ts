import { Role } from '../../common/types/role';

// Contenido firmado dentro del JWT. patientId / dentistId evitan consultar la BD en cada petición.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  patientId?: string;
  dentistId?: string;
}
