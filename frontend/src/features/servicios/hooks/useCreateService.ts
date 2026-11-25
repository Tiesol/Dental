import { useCallback } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { CreateServiceRequest } from '@/api/types';

// Alta de un servicio (ADMIN). Lanza ApiError si el backend rechaza (p. ej. nombre duplicado).
export function useCreateService() {
  return useCallback((data: CreateServiceRequest) => servicesApi.create(data), []);
}
