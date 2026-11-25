import { http } from '../http';
import type { CreateServiceRequest, ServiceResponse, UpdateServiceRequest } from '../types';

export const servicesApi = {
  // ADMIN recibe todos; PACIENTE y ODONTOLOGO solo los habilitados.
  list: () => http.get<ServiceResponse[]>('/services'),
  get: (id: string) => http.get<ServiceResponse>(`/services/${id}`),

  // Solo ADMIN
  create: (body: CreateServiceRequest) => http.post<ServiceResponse>('/services', body),
  update: (id: string, body: UpdateServiceRequest) =>
    http.patch<ServiceResponse>(`/services/${id}`, body),
  changeStatus: (id: string, active: boolean) =>
    http.patch<ServiceResponse>(`/services/${id}/estado`, { activo: active }),
};
