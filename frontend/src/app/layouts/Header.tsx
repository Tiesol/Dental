import { Link, NavLink } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from '@/features/auth';
import { Avatar } from '@/shared/components/Avatar';
import { Icon, type IconName } from '@/shared/components/Icon';
import { ROLE_LABEL } from '@/shared/lib/roles';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

const CUENTA: NavItem = { to: '/', label: 'Mi cuenta', icon: 'user', end: true };

const NAV_POR_ROL: Record<Role, NavItem[]> = {
  PACIENTE: [
    CUENTA,
    { to: '/servicios', label: 'Servicios', icon: 'list' },
    { to: '/odontologos', label: 'Odontólogos', icon: 'tooth' },
    { to: '/reservar', label: 'Reservar cita', icon: 'plus' },
    { to: '/mis-citas', label: 'Mis citas', icon: 'calendar' },
  ],
  ODONTOLOGO: [CUENTA],
  ADMIN: [
    CUENTA,
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
              <NavLink to={item.to} end={item.end}>
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-user">
        <Avatar name={user.nombre} />
        <div className="sidebar-user-text">
          <strong>{user.nombre}</strong>
          <span>{ROLE_LABEL[user.role]}</span>
        </div>
        <button type="button" className="logout" onClick={logout} data-testid="btn-logout">
          <Icon name="logout" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
