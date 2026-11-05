import { Outlet } from 'react-router-dom';
import { Header } from './Header';

// Estructura de las páginas con sesión: menú por rol y contenido.
export function AppLayout() {
  return (
    <div className="shell">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
