import { http } from '../http';
import type {
  CreateDentistRequest,
  DentistAdminResponse,
  DentistPublicResponse,
  UpdateDentistRequest,
} from '../types';

const conFiltro = (serviceId?: string) =>
  serviceId ? `/dentists?serviceId=${encodeURIComponent(serviceId)}` : '/dentists';

// El mismo endpoint devuelve una vista distinta según el rol del token.
export const dentistsApi = {
  listar: (serviceId?: string) => http.get<DentistPublicResponse[]>(conFiltro(serviceId)),

  // Solo ADMIN
  listarAdmin: () => http.get<DentistAdminResponse[]>('/dentists'),
  obtenerAdmin: (id: string) => http.get<DentistAdminResponse>(`/dentists/${id}`),
  crear: (body: CreateDentistRequest) => http.post<DentistAdminResponse>('/dentists', body),
  actualizar: (id: string, body: UpdateDentistRequest) =>
    http.patch<DentistAdminResponse>(`/dentists/${id}`, body),
  cambiarEstado: (id: string, activo: boolean) =>
    http.patch<DentistAdminResponse>(`/dentists/${id}/estado`, { activo }),
  asignarServicios: (id: string, serviceIds: string[]) =>
    http.put<DentistAdminResponse>(`/dentists/${id}/services`, { serviceIds }),
};
