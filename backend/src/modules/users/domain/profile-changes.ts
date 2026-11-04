import { CampoNoAplicableAlRolError } from '../../../common/errors/domain-error';
import { Role } from '../../../common/types/role';
import { ProfileFields, UserChanges } from './user';

// Qué campos de perfil tiene cada rol. El rol no se puede cambiar (decisión del proyecto),
// así que esta tabla define por completo qué se puede editar de cada usuario.
const CAMPOS_POR_ROL: Record<Role, readonly (keyof ProfileFields)[]> = {
  PACIENTE: ['nombre', 'apellido', 'telefono'],
  ODONTOLOGO: ['nombre', 'especialidad'],
  ADMIN: [],
};

// Traduce los campos enviados a los cambios concretos del perfil que corresponde al rol.
// Rechaza (400) cualquier campo que no aplique al rol en vez de ignorarlo en silencio.
export function construirCambiosDePerfil(role: Role, campos: ProfileFields): UserChanges {
  const enviados = (Object.keys(campos) as (keyof ProfileFields)[]).filter(
    (campo) => campos[campo] !== undefined,
  );
  const noAplicables = enviados.filter((campo) => !CAMPOS_POR_ROL[role].includes(campo));
  if (noAplicables.length > 0) {
    throw new CampoNoAplicableAlRolError(noAplicables, role);
  }
  if (enviados.length === 0) {
    return {};
  }

  if (role === 'PACIENTE') {
    return {
      patient: {
        ...(campos.nombre !== undefined ? { nombre: campos.nombre } : {}),
        ...(campos.apellido !== undefined ? { apellido: campos.apellido } : {}),
        // Un teléfono vacío borra el dato (es opcional).
        ...(campos.telefono !== undefined ? { telefono: campos.telefono?.trim() || null } : {}),
      },
    };
  }
  return {
    dentist: {
      ...(campos.nombre !== undefined ? { nombre: campos.nombre } : {}),
      ...(campos.especialidad !== undefined ? { especialidad: campos.especialidad } : {}),
    },
  };
}
