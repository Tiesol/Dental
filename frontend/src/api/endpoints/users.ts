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
  list: () => http.get<UserDetail[]>('/users'),
  get: (id: string) => http.get<UserDetail>(`/users/${id}`),
  create: (body: CreateUserRequest) => http.post<UserDetail>('/users', body),
  update: (id: string, body: UpdateUserRequest) => http.patch<UserDetail>(`/users/${id}`, body),
  changeStatus: (id: string, active: boolean) =>
    http.patch<UserDetail>(`/users/${id}/estado`, { activo: active }),

  // Cuenta propia (cualquier rol)
  myProfile: () => http.get<UserDetail>('/users/me'),
  updateMyProfile: (body: UpdateMyProfileRequest) => http.patch<UserDetail>('/users/me', body),
  changePassword: (body: ChangePasswordRequest) => http.patch<void>('/users/me/password', body),
};
