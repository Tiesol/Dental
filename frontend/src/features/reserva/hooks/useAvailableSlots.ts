import { useCallback } from 'react';
import { availabilityApi } from '@/api/endpoints/availability';
import { useLoader } from '@/shared/hooks/useLoader';

// La lista se muestra tal cual la devuelve el backend: no se filtra ni se recalcula aquí. Al cambiar
// la fecha se cancela la consulta anterior.
export function useAvailableSlots(dentistId: string, serviceId: string, date: string) {
  const load = useCallback(
    (signal: AbortSignal) =>
      date
        ? availabilityApi.availableSlots(dentistId, serviceId, date, signal)
        : Promise.resolve([]),
    [dentistId, serviceId, date],
  );
  return useLoader(load);
}
