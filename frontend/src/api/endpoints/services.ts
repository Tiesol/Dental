import { http } from '../http';
import type { CreateServiceRequest, ServiceResponse, UpdateServiceRequest } from '../types';

export const servicesApi = {
  // ADMIN recibe todos; PACIENTE y ODONTOLOGO solo los habilitados.
  listar: () => http.get<ServiceResponse[]>('/services'),
  obtener: (id: string) => http.get<ServiceResponse>(`/services/${id}`),

  // Solo ADMIN
  crear: (body: CreateServiceRequest) => http.post<ServiceResponse>('/services', body),
  actualizar: (id: string, body: UpdateServiceRequest) =>
    http.patch<ServiceResponse>(`/services/${id}`, body),
  cambiarEstado: (id: string, activo: boolean) =>
    http.patch<ServiceResponse>(`/services/${id}/estado`, { activo }),
};
