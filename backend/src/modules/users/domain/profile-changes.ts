import { FieldNotApplicableToRoleError } from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { ProfileFields, UserChanges } from './user';

// Qué campos de perfil tiene cada rol. El rol no se puede cambiar (decisión del proyecto),
// así que esta tabla define por completo qué se puede editar de cada usuario.
const FIELDS_BY_ROLE: Record<Role, readonly (keyof ProfileFields)[]> = {
  PACIENTE: ['nombre', 'apellido', 'telefono'],
  ODONTOLOGO: ['nombre', 'especialidad'],
  ADMIN: [],
};

// Traduce los campos enviados a los cambios concretos del perfil que corresponde al rol.
// Rechaza (400) cualquier campo que no aplique al rol en vez de ignorarlo en silencio.
export function buildProfileChanges(role: Role, fields: ProfileFields): UserChanges {
  const sent = (Object.keys(fields) as (keyof ProfileFields)[]).filter(
    (field) => fields[field] !== undefined,
  );
  const notApplicable = sent.filter((field) => !FIELDS_BY_ROLE[role].includes(field));
  if (notApplicable.length > 0) {
    throw new FieldNotApplicableToRoleError(notApplicable, role);
  }
  if (sent.length === 0) {
    return {};
  }

  if (role === 'PACIENTE') {
    return {
      patient: {
        ...(fields.nombre !== undefined ? { nombre: fields.nombre } : {}),
        ...(fields.apellido !== undefined ? { apellido: fields.apellido } : {}),
        // Un teléfono vacío borra el dato (es opcional).
        ...(fields.telefono !== undefined ? { telefono: fields.telefono?.trim() || null } : {}),
      },
    };
  }
  return {
    dentist: {
      ...(fields.nombre !== undefined ? { nombre: fields.nombre } : {}),
      ...(fields.especialidad !== undefined ? { especialidad: fields.especialidad } : {}),
    },
  };
}
