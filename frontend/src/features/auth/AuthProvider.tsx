import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/api/endpoints/auth';
import { onSesionExpirada } from '@/api/http';
import { tokenStore } from '@/api/token';
import type { RegisterRequest, UserResponse } from '@/api/types';
import { setErrorReportUser } from '@/shared/lib/error-report';
import { AuthContext, type AuthContextValue } from './auth-context';

// Mantiene la sesión: al arrancar valida el token guardado con GET /auth/me.
// El rol siempre viene del backend, nunca se decodifica el JWT en el cliente.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);
  const [sesionExpirada, setSesionExpirada] = useState(false);

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
      onSesionExpirada(() => {
        setUser(null);
        setSesionExpirada(true);
      }),
    [],
  );

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
    setSesionExpirada(false);
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
    sesionExpirada,
    login,
    register,
    logout,
    refresh,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
