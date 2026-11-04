import { NavLink, Link } from 'react-router-dom';
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
          <NavLink to="/" end>
            Mi cuenta
          </NavLink>
          {user.role === 'PACIENTE' && (
            <>
              <NavLink to="/servicios">Servicios</NavLink>
              <NavLink to="/odontologos">Odontólogos</NavLink>
            </>
          )}
          {user.role === 'ADMIN' && (
            <>
              <NavLink to="/admin/usuarios">Usuarios</NavLink>
              <NavLink to="/admin/servicios">Servicios</NavLink>
              <NavLink to="/admin/odontologos">Odontólogos</NavLink>
            </>
          )}
          <button type="button" className="link" onClick={logout} data-testid="btn-logout">
            Cerrar sesión
          </button>
        </nav>
      )}
    </header>
  );
}
