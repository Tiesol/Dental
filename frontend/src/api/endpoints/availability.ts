import { http } from '../http';
import type {
  AvailabilityResponse,
  AvailabilityRuleRequest,
  CreateBlockRequest,
  SlotResponse,
  UnavailableBlockResponse,
} from '../types';

export const availabilityApi = {
  get: (dentistId: string) => http.get<AvailabilityResponse>(`/dentists/${dentistId}/availability`),

  availableSlots: (dentistId: string, serviceId: string, date: string, signal?: AbortSignal) =>
    http.get<SlotResponse[]>(
      `/dentists/${dentistId}/slots?serviceId=${encodeURIComponent(serviceId)}&fecha=${encodeURIComponent(date)}`,
      signal,
    ),

  // Solo ADMIN
  replaceSchedule: (dentistId: string, schedule: AvailabilityRuleRequest[]) =>
    http.put<AvailabilityResponse>(`/dentists/${dentistId}/availability`, { horarios: schedule }),
  createBlock: (dentistId: string, body: CreateBlockRequest) =>
    http.post<UnavailableBlockResponse>(`/dentists/${dentistId}/blocks`, body),
  deleteBlock: (dentistId: string, blockId: string) =>
    http.delete<null>(`/dentists/${dentistId}/blocks/${blockId}`),
};
