import { http } from '../http';
import type {
  CreateDentistRequest,
  DentistAdminResponse,
  DentistPublicResponse,
  UpdateDentistRequest,
} from '../types';

const withFilter = (serviceId?: string) =>
  serviceId ? `/dentists?serviceId=${encodeURIComponent(serviceId)}` : '/dentists';

// El mismo endpoint devuelve una vista distinta según el rol del token.
export const dentistsApi = {
  list: (serviceId?: string, signal?: AbortSignal) =>
    http.get<DentistPublicResponse[]>(withFilter(serviceId), signal),
  // Vista pública de uno; 404 si no existe o no acepta citas.
  get: (id: string, signal?: AbortSignal) =>
    http.get<DentistPublicResponse>(`/dentists/${id}`, signal),

  // Solo ADMIN
  listAdmin: () => http.get<DentistAdminResponse[]>('/dentists'),
  getAdmin: (id: string) => http.get<DentistAdminResponse>(`/dentists/${id}`),
  create: (body: CreateDentistRequest) => http.post<DentistAdminResponse>('/dentists', body),
  update: (id: string, body: UpdateDentistRequest) =>
    http.patch<DentistAdminResponse>(`/dentists/${id}`, body),
  changeStatus: (id: string, active: boolean) =>
    http.patch<DentistAdminResponse>(`/dentists/${id}/estado`, { activo: active }),
  assignServices: (id: string, serviceIds: string[]) =>
    http.put<DentistAdminResponse>(`/dentists/${id}/services`, { serviceIds }),
};
