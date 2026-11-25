import { useCallback } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { CreateDentistRequest } from '@/api/types';

// Registro de un odontólogo (ADMIN). Lanza ApiError si el backend rechaza (email duplicado, etc.).
export function useCreateDentist() {
  return useCallback((data: CreateDentistRequest) => dentistsApi.create(data), []);
}
