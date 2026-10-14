import { createContext } from 'react';
import type { RegisterRequest, UserResponse } from '@/api/types';

export type AuthContextValue = {
  user: UserResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
