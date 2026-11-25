import { http } from '../http';
import type {
  AppointmentFiltersRequest,
  AppointmentResponse,
  CreateAppointmentRequest,
  AppointmentWhen,
  AppointmentStatus,
} from '../types';

const withFilters = (filters: AppointmentFiltersRequest) => {
  const query = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  return query ? `/appointments?${query}` : '/appointments';
};

export const appointmentsApi = {
  book: (body: CreateAppointmentRequest) => http.post<AppointmentResponse>('/appointments', body),
  mine: (when: AppointmentWhen, signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>(`/appointments/mine?cuando=${when}`, signal),
  byId: (id: string, signal?: AbortSignal) =>
    http.get<AppointmentResponse>(`/appointments/${id}`, signal),
  reschedule: (id: string, startsAt: string) =>
    http.patch<AppointmentResponse>(`/appointments/${id}/reschedule`, { horaInicio: startsAt }),
  cancel: (id: string) => http.patch<AppointmentResponse>(`/appointments/${id}/cancel`),
  changeStatus: (id: string, status: AppointmentStatus) =>
    http.patch<AppointmentResponse>(`/appointments/${id}/status`, { estado: status }),
  registerObservation: (id: string, text: string) =>
    http.post<{ texto: string; createdAt: string }>(`/appointments/${id}/observation`, {
      texto: text,
    }),

  // Solo ADMIN
  all: (filters: AppointmentFiltersRequest = {}, signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>(withFilters(filters), signal),

  // Solo ODONTOLOGO
  agenda: (date?: string, signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>(
      date ? `/dentists/me/agenda?fecha=${encodeURIComponent(date)}` : '/dentists/me/agenda',
      signal,
    ),
  upcomingAgenda: (signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>('/dentists/me/agenda/upcoming', signal),
};
