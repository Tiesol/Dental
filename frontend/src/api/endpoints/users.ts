import { http } from '../http';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateMyProfileRequest,
  UpdateUserRequest,
  UserDetail,
} from '../types';

export const usersApi = {
  // Solo ADMIN
  listar: () => http.get<UserDetail[]>('/users'),
  obtener: (id: string) => http.get<UserDetail>(`/users/${id}`),
  crear: (body: CreateUserRequest) => http.post<UserDetail>('/users', body),
  actualizar: (id: string, body: UpdateUserRequest) => http.patch<UserDetail>(`/users/${id}`, body),
  cambiarEstado: (id: string, activo: boolean) =>
    http.patch<UserDetail>(`/users/${id}/estado`, { activo }),

  // Cuenta propia (cualquier rol)
  miPerfil: () => http.get<UserDetail>('/users/me'),
  actualizarMiPerfil: (body: UpdateMyProfileRequest) => http.patch<UserDetail>('/users/me', body),
  cambiarPassword: (body: ChangePasswordRequest) => http.patch<void>('/users/me/password', body),
};
