import { useCallback } from 'react';
import { availabilityApi } from '@/api/endpoints/availability';
import { useCarga } from '@/shared/hooks/useCarga';

// La lista se muestra tal cual la devuelve el backend: no se filtra ni se recalcula aquí. Al cambiar
// la fecha se cancela la consulta anterior.
export function useSlotsDisponibles(dentistId: string, serviceId: string, fecha: string) {
  const cargar = useCallback(
    (signal: AbortSignal) =>
      fecha
        ? availabilityApi.horariosDisponibles(dentistId, serviceId, fecha, signal)
        : Promise.resolve([]),
    [dentistId, serviceId, fecha],
  );
  return useCarga(cargar);
}
