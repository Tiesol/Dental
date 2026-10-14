import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from './useAuth';

type Props = { children: ReactNode; roles?: Role[] };

// Protege un grupo de rutas: sin sesión redirige a /login; con rol incorrecto muestra 403.
// Es solo experiencia de usuario: la seguridad real la aplica el backend.
export function RequireRole({ children, roles }: Props) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <section className="card" role="alert">
        <h1>Acceso denegado</h1>
        <p className="muted">No tienes permiso para ver esta página.</p>
      </section>
    );
  }
  return children;
}
