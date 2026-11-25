import { Link, NavLink } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from '@/features/auth';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { Icon, type IconName } from '@/shared/components/Icon';
import { ROLE_LABEL } from '@/shared/lib/roles';

type NavItem = { to: string; label: string; icon: IconName };

const NAV_POR_ROL: Record<Role, NavItem[]> = {
  PACIENTE: [
    { to: '/servicios', label: 'Servicios', icon: 'list' },
    { to: '/odontologos', label: 'Odontólogos', icon: 'tooth' },
    { to: '/reservar', label: 'Reservar cita', icon: 'plus' },
    { to: '/mis-citas', label: 'Mis citas', icon: 'calendar' },
  ],
  ODONTOLOGO: [{ to: '/agenda', label: 'Agenda', icon: 'calendar' }],
  ADMIN: [
    { to: '/admin/citas', label: 'Citas', icon: 'calendar' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
    { to: '/admin/servicios', label: 'Servicios', icon: 'list' },
    { to: '/admin/odontologos', label: 'Odontólogos', icon: 'tooth' },
  ],
};

export function Header() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="sidebar">
      <Link to="/" className="brand">
        <Icon name="tooth" />
        Clínica Dental
      </Link>
      <nav aria-label="Principal" className="sidebar-nav">
        <ul>
          {NAV_POR_ROL[user.role].map((item) => (
            <li key={item.to}>
              <NavLink to={item.to}>
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-user">
        {/* "Mi cuenta" no ocupa un lugar en el menú: se abre desde el nombre. En celular solo se
            ven las iniciales, así que el nombre accesible lo da el texto oculto. */}
        <NavLink to="/mi-cuenta" className="sidebar-account" title="Mi cuenta">
          <span className="sr-only">Mi cuenta:</span>
          <Avatar name={user.nombre} />
          <span className="sidebar-user-text">
            <strong>{user.nombre}</strong>
            <span>{ROLE_LABEL[user.role]}</span>
          </span>
        </NavLink>
        <Button variant="secondary" className="logout" onClick={logout} data-testid="btn-logout">
          <Icon name="logout" />
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
