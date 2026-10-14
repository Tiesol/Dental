import { ROLE_LABEL } from '@/shared/lib/roles';
import { useUsuarios } from '../hooks/useUsuarios';

export function UsuariosPage() {
  const estado = useUsuarios();

  return (
    <section className="card wide">
      <h1>Usuarios</h1>
      {estado.status === 'cargando' && <p className="muted">Cargando…</p>}
      {estado.status === 'error' && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.mensaje}
        </p>
      )}
      {estado.status === 'ok' && estado.usuarios.length === 0 && (
        <p className="muted">No hay usuarios registrados.</p>
      )}
      {estado.status === 'ok' && estado.usuarios.length > 0 && (
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
            {estado.usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABEL[u.role]}</td>
                <td>{u.activo ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
