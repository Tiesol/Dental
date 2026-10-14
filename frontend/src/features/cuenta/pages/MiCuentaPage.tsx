import { useAuth } from '@/features/auth';
import { ROLE_LABEL } from '@/shared/lib/roles';

export function MiCuentaPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section className="card">
      <h1>Hola, {user.nombre}</h1>
      <dl>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Rol</dt>
        <dd>{ROLE_LABEL[user.role]}</dd>
        <dt>Miembro desde</dt>
        <dd>{new Date(user.createdAt).toLocaleDateString('es')}</dd>
      </dl>
    </section>
  );
}
