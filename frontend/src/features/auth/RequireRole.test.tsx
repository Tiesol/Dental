import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { usuarioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { RequireRole } from './RequireRole';

function renderProtegida(opciones: { conSesion: boolean }) {
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
    { route: '/admin', ...opciones },
  );
}

describe('RequireRole', () => {
  it('sin sesión redirige a /login', async () => {
    renderProtegida({ conSesion: false });

    expect(await screen.findByRole('heading', { name: 'Página de login' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Panel de administración' }),
    ).not.toBeInTheDocument();
  });

  it('con sesión de un rol no permitido muestra acceso denegado sin renderizar el contenido', async () => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json(usuarioDePrueba({ role: 'PACIENTE' }))),
    );

    renderProtegida({ conSesion: true });

    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso denegado');
    expect(
      screen.queryByRole('heading', { name: 'Panel de administración' }),
    ).not.toBeInTheDocument();
  });

  it('con sesión de un rol permitido renderiza el contenido', async () => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json(usuarioDePrueba({ role: 'ADMIN' }))),
    );

    renderProtegida({ conSesion: true });

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

    renderProtegida({ conSesion: true });

    expect(await screen.findByRole('heading', { name: 'Página de login' })).toBeInTheDocument();
    expect(localStorage.getItem('citas-dentales.token')).toBeNull();
  });
});
