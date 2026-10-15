import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { tokenStore } from '@/api/token';
import { AuthProvider } from '@/features/auth';
import { TOKEN_DE_PRUEBA } from './msw/handlers';

type Options = {
  // Ruta inicial del router en memoria.
  route?: string;
  // Si es true, deja un token válido guardado: AuthProvider llamará a /auth/me (simulado por MSW).
  conSesion?: boolean;
};

// Renderiza con los mismos providers que la app real (AuthProvider + Router), pero con un
// MemoryRouter para controlar la ruta sin tocar window.location.
export function renderWithProviders(
  ui: ReactNode,
  { route = '/', conSesion = false }: Options = {},
) {
  if (conSesion) {
    tokenStore.set(TOKEN_DE_PRUEBA);
  }
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthProvider>,
  );
}
