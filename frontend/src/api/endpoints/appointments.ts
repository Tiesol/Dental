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
  mias: (cuando: CuandoCitas) =>
    http.get<AppointmentResponse[]>(`/appointments/mine?cuando=${cuando}`),
  porId: (id: string) => http.get<AppointmentResponse>(`/appointments/${id}`),
  reprogramar: (id: string, horaInicio: string) =>
    http.patch<AppointmentResponse>(`/appointments/${id}/reschedule`, { horaInicio }),
  cancelar: (id: string) => http.patch<AppointmentResponse>(`/appointments/${id}/cancel`),
  cambiarEstado: (id: string, estado: EstadoCita) =>
    http.patch<AppointmentResponse>(`/appointments/${id}/status`, { estado }),
  registrarObservacion: (id: string, texto: string) =>
    http.post<{ texto: string; createdAt: string }>(`/appointments/${id}/observation`, { texto }),

  // Solo ADMIN
  todas: (filtros: AppointmentFiltersRequest = {}) =>
    http.get<AppointmentResponse[]>(conFiltros(filtros)),

  // Solo ODONTOLOGO
  agenda: (fecha?: string) =>
    http.get<AppointmentResponse[]>(
      fecha ? `/dentists/me/agenda?fecha=${encodeURIComponent(fecha)}` : '/dentists/me/agenda',
    ),
  agendaProximas: () => http.get<AppointmentResponse[]>('/dentists/me/agenda/upcoming'),
};
