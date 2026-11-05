import { http } from '../http';
import type {
  AvailabilityResponse,
  AvailabilityRuleRequest,
  CreateBlockRequest,
  SlotResponse,
  UnavailableBlockResponse,
} from '../types';

export const availabilityApi = {
  obtener: (dentistId: string) =>
    http.get<AvailabilityResponse>(`/dentists/${dentistId}/availability`),

  horariosDisponibles: (dentistId: string, serviceId: string, fecha: string) =>
    http.get<SlotResponse[]>(
      `/dentists/${dentistId}/slots?serviceId=${encodeURIComponent(serviceId)}&fecha=${encodeURIComponent(fecha)}`,
    ),

  // Solo ADMIN
  reemplazarHorarios: (dentistId: string, horarios: AvailabilityRuleRequest[]) =>
    http.put<AvailabilityResponse>(`/dentists/${dentistId}/availability`, { horarios }),
  crearBloque: (dentistId: string, body: CreateBlockRequest) =>
    http.post<UnavailableBlockResponse>(`/dentists/${dentistId}/blocks`, body),
  borrarBloque: (dentistId: string, blockId: string) =>
    http.delete<null>(`/dentists/${dentistId}/blocks/${blockId}`),
};
