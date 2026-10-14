import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/api/endpoints/auth';
import { tokenStore } from '@/api/token';
import type { RegisterRequest, UserResponse } from '@/api/types';
import { AuthContext, type AuthContextValue } from './auth-context';

// Mantiene la sesión: al arrancar valida el token guardado con GET /auth/me.
// El rol siempre viene del backend, nunca se decodifica el JWT en el cliente.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    let activo = true;
    authApi
      .me()
      .then((u) => {
        if (activo) setUser(u);
      })
      .catch(() => {
        if (activo) logout();
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStore.set(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data);
      await login(data.email, data.password);
    },
    [login],
  );

  const value: AuthContextValue = { user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
