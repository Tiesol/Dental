import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testUser } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { RequireRole } from './RequireRole';

function renderProtected(options: { withSession: boolean }) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Página de login</h1>} />
      <Route
        path="/admin"
        element={
          <RequireRole roles={['ADMIN']}>
            <h1>Panel de administración</h1>
          </RequireRole>
        }
      />
    </Routes>,
    { route: '/admin', ...options },
  );
}

describe('RequireRole', () => {
  it('sin sesión redirige a /login', async () => {
    renderProtected({ withSession: false });

    expect(await screen.findByRole('heading', { name: 'Página de login' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Panel de administración' }),
    ).not.toBeInTheDocument();
  });

  it('con sesión de un rol no permitido muestra acceso denegado sin renderizar el contenido', async () => {
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser({ role: 'PACIENTE' }))));

    renderProtected({ withSession: true });

    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso denegado');
    expect(
      screen.queryByRole('heading', { name: 'Panel de administración' }),
    ).not.toBeInTheDocument();
  });

  it('con sesión de un rol permitido renderiza el contenido', async () => {
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser({ role: 'ADMIN' }))));

    renderProtected({ withSession: true });

    expect(
      await screen.findByRole('heading', { name: 'Panel de administración' }),
    ).toBeInTheDocument();
  });

  it('si el token guardado ya no es válido cierra la sesión y redirige a /login', async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Token inválido' }, { status: 401 }),
      ),
    );

    renderProtected({ withSession: true });

    expect(await screen.findByRole('heading', { name: 'Página de login' })).toBeInTheDocument();
    expect(localStorage.getItem('citas-dentales.token')).toBeNull();
  });
});
