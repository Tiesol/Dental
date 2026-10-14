import { useEffect, useState } from 'react';
import { api, type User } from '../api';
import { useAuth } from '../auth';

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<User[]>('/users', { token })
      .then(setUsers)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <section className="card wide">
      <h1>Usuarios</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {!users && !error && <p className="muted">Cargando…</p>}
      {users && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
