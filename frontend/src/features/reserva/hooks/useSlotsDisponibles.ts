import { useCallback } from 'react';
import { availabilityApi } from '@/api/endpoints/availability';
import { useCarga } from '@/shared/hooks/useCarga';

// La lista se muestra tal cual la devuelve el backend: no se filtra ni se recalcula aquí.
export function useSlotsDisponibles(dentistId: string, serviceId: string, fecha: string) {
  const cargar = useCallback(
    () =>
      fecha
        ? availabilityApi.horariosDisponibles(dentistId, serviceId, fecha)
        : Promise.resolve([]),
    [dentistId, serviceId, fecha],
  );
  return useCarga(cargar);
}
