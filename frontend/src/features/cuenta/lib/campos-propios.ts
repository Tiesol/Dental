import type { Role, UpdateMyProfileRequest } from '@/api/types';
import { CAMPOS_PERFIL_POR_ROL } from '@/shared/lib/roles';

export type CampoPropio = keyof UpdateMyProfileRequest;

// Campos que cada rol edita de sí mismo. Email, rol y especialidad los gestiona el ADMIN.
export function camposPropios(role: Role): CampoPropio[] {
  return CAMPOS_PERFIL_POR_ROL[role].filter((c): c is CampoPropio => c !== 'especialidad');
}
