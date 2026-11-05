import { Outlet } from 'react-router-dom';
import { Icon } from '@/shared/components/Icon';

// Estructura de login y registro: panel de marca y formulario, sin el menú de la aplicación.
export function AuthLayout() {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <span className="brand">
          <Icon name="tooth" />
          Clínica Dental
        </span>
        <div className="auth-brand-text">
          <p>Tu atención dental, en un solo lugar.</p>
          <p>Consulta los servicios de la clínica y mantén tus datos al día.</p>
        </div>
        <div className="auth-brand-mark">
          <Icon name="tooth" />
        </div>
      </aside>
      <main className="auth-main">
        <Outlet />
      </main>
    </div>
  );
}
