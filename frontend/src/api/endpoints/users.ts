import { http } from '../http';
import type { UserResponse } from '../types';

export const usersApi = {
  listar: () => http.get<UserResponse[]>('/users'),
};
