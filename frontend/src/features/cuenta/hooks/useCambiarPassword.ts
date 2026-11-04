import { useCallback } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { ChangePasswordRequest } from '@/api/types';

// Cambia la contraseña propia verificando la actual. Lanza ApiError si el backend rechaza.
export function useCambiarPassword() {
  return useCallback(async (datos: ChangePasswordRequest) => {
    await usersApi.cambiarPassword(datos);
  }, []);
}
