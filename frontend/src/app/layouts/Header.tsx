import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth';

export function Header() {
  const { user, logout } = useAuth();
  return (
    <header>
      <Link to="/" className="brand">
        Clínica Dental
      </Link>
      {user && (
        <nav aria-label="Principal">
          <Link to="/">Mi cuenta</Link>
          {user.role === 'ADMIN' && <Link to="/admin/usuarios">Usuarios</Link>}
          <button type="button" className="link" onClick={logout} data-testid="btn-logout">
            Cerrar sesión
          </button>
        </nav>
      )}
    </header>
  );
}
