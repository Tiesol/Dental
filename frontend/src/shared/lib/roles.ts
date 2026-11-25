import type { Role } from '@/api/types';

export const ROLE_LABEL: Record<Role, string> = {
  PACIENTE: 'Paciente',
  ODONTOLOGO: 'Odontólogo',
  ADMIN: 'Administrador',
};

// Campos de perfil editables según el rol (espejo de backend/src/modules/users/domain/profile-changes.ts).
// El rol de un usuario no se puede cambiar.
export const PROFILE_FIELDS_BY_ROLE: Record<
  Role,
  readonly ('nombre' | 'apellido' | 'telefono' | 'especialidad')[]
> = {
  PACIENTE: ['nombre', 'apellido', 'telefono'],
  ODONTOLOGO: ['nombre', 'especialidad'],
  ADMIN: [],
};

// Pantalla a la que llega cada rol al iniciar sesión o al abrir la raíz.
export const HOME_BY_ROLE: Record<Role, string> = {
  PACIENTE: '/mis-citas',
  ODONTOLOGO: '/agenda',
  ADMIN: '/admin/citas',
};
