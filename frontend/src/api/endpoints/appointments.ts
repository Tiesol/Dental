import { http } from '../http';
import type {
  AppointmentFiltersRequest,
  AppointmentResponse,
  CreateAppointmentRequest,
  CuandoCitas,
  EstadoCita,
} from '../types';

const conFiltros = (filtros: AppointmentFiltersRequest) => {
  const query = new URLSearchParams(
    Object.entries(filtros)
      .filter(([, valor]) => valor !== undefined && valor !== '')
      .map(([clave, valor]) => [clave, String(valor)]),
  ).toString();
  return query ? `/appointments?${query}` : '/appointments';
};

export const appointmentsApi = {
  reservar: (body: CreateAppointmentRequest) =>
    http.post<AppointmentResponse>('/appointments', body),
  mias: (cuando: CuandoCitas, signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>(`/appointments/mine?cuando=${cuando}`, signal),
  porId: (id: string, signal?: AbortSignal) =>
    http.get<AppointmentResponse>(`/appointments/${id}`, signal),
  reprogramar: (id: string, horaInicio: string) =>
    http.patch<AppointmentResponse>(`/appointments/${id}/reschedule`, { horaInicio }),
  cancelar: (id: string) => http.patch<AppointmentResponse>(`/appointments/${id}/cancel`),
  cambiarEstado: (id: string, estado: EstadoCita) =>
    http.patch<AppointmentResponse>(`/appointments/${id}/status`, { estado }),
  registrarObservacion: (id: string, texto: string) =>
    http.post<{ texto: string; createdAt: string }>(`/appointments/${id}/observation`, { texto }),

  // Solo ADMIN
  todas: (filtros: AppointmentFiltersRequest = {}, signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>(conFiltros(filtros), signal),

  // Solo ODONTOLOGO
  agenda: (fecha?: string, signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>(
      fecha ? `/dentists/me/agenda?fecha=${encodeURIComponent(fecha)}` : '/dentists/me/agenda',
      signal,
    ),
  agendaProximas: (signal?: AbortSignal) =>
    http.get<AppointmentResponse[]>('/dentists/me/agenda/upcoming', signal),
};
