import type { Role, UpdateMyProfileRequest } from '@/api/types';
import { PROFILE_FIELDS_BY_ROLE } from '@/shared/lib/roles';

export type OwnField = keyof UpdateMyProfileRequest;

// Campos que cada rol edita de sí mismo. Email, rol y especialidad los gestiona el ADMIN.
export function ownFields(role: Role): OwnField[] {
  return PROFILE_FIELDS_BY_ROLE[role].filter((c): c is OwnField => c !== 'especialidad');
}
