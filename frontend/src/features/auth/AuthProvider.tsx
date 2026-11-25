import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/api/endpoints/auth';
import { onSessionExpired } from '@/api/http';
import { tokenStore } from '@/api/token';
import type { RegisterRequest, UserResponse } from '@/api/types';
import { setErrorReportUser } from '@/shared/lib/error-report';
import { AuthContext, type AuthContextValue } from './auth-context';

// Mantiene la sesión: al arrancar valida el token guardado con GET /auth/me.
// El rol siempre viene del backend, nunca se decodifica el JWT en el cliente.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // El detalle técnico de un error inesperado incluye quién estaba usando la aplicación.
  useEffect(() => {
    setErrorReportUser(user ? `${user.email} (${user.role})` : null);
  }, [user]);

  // Cualquier 401 con token (vencido o cuenta deshabilitada) cierra la sesión en toda la app.
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        setSessionExpired(true);
      }),
    [],
  );

  useEffect(() => {
    if (!tokenStore.get()) return;
    let active = true;
    authApi
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStore.set(res.accessToken);
    setSessionExpired(false);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data);
      await login(data.email, data.password);
    },
    [login],
  );

  const refresh = useCallback(async () => {
    setUser(await authApi.me());
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    sessionExpired,
    login,
    register,
    logout,
    refresh,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
