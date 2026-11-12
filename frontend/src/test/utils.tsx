import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
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

// Elige una opción de un Select propio: abre la lista desde su disparador y hace clic en la opción.
// La lista vive en un portal, por eso la opción se busca en toda la pantalla.
export async function elegirOpcion(user: UserEvent, disparador: HTMLElement, opcion: string) {
  await user.click(disparador);
  await user.click(await screen.findByRole('option', { name: opcion }));
}
