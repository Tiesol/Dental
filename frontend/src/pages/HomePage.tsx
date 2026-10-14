import { useAuth } from '../auth';

const ROLE_LABEL = {
  PATIENT: 'Paciente',
  DENTIST: 'Dentista',
  ADMIN: 'Administrador',
} as const;

export function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section className="card">
      <h1>Hola, {user.fullName}</h1>
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
