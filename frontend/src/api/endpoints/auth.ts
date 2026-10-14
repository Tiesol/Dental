import { http } from '../http';
import type { LoginRequest, LoginResponse, RegisterRequest, UserResponse } from '../types';

export const authApi = {
  register: (body: RegisterRequest) => http.post<UserResponse>('/auth/register', body),
  login: (body: LoginRequest) => http.post<LoginResponse>('/auth/login', body),
  me: () => http.get<UserResponse>('/auth/me'),
};
