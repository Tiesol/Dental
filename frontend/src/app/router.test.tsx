import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { testUser } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { AppRoutes } from './router';

function userWithRole(role: 'PACIENTE' | 'ODONTOLOGO' | 'ADMIN') {
  const user = testUser({ role });
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json(user)),
    http.get(`${API}/users/me`, () =>
      HttpResponse.json({ ...user, paciente: null, odontologo: null }),
    ),
  );
}

// Las pantallas de inicio de cada rol piden sus listas al montar; aquí llegan vacías.
function emptyHomeScreens() {
  server.use(
    http.get(`${API}/appointments/mine`, () => HttpResponse.json([])),
    http.get(`${API}/dentists/me/agenda`, () => HttpResponse.json([])),
    http.get(`${API}/dentists/me/agenda/upcoming`, () => HttpResponse.json([])),
    http.get(`${API}/appointments`, () => HttpResponse.json([])),
    http.get(`${API}/dentists`, () => HttpResponse.json([])),
  );
}

describe('AppRoutes', () => {
  it.each([
    ['PACIENTE', 'Mis citas'],
    ['ODONTOLOGO', 'Agenda'],
    ['ADMIN', 'Citas'],
  ] as const)(
    'al entrar a la raíz, el %s llega a su pantalla principal: %s',
    async (role, title) => {
      userWithRole(role);
      emptyHomeScreens();

      renderWithProviders(<AppRoutes />, { route: '/', withSession: true });

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    },
  );

  it('Mi cuenta tiene su propia ruta para cualquier rol', async () => {
    userWithRole('ODONTOLOGO');

    renderWithProviders(<AppRoutes />, { route: '/mi-cuenta', withSession: true });

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mi cuenta/, current: 'page' })).toHaveAttribute(
      'href',
      '/mi-cuenta',
    );
  });

  it('el login se muestra sin el menú de la aplicación', async () => {
    renderWithProviders(<AppRoutes />, { route: '/login' });

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('el registro se muestra sin el menú de la aplicación', async () => {
    renderWithProviders(<AppRoutes />, { route: '/registro' });

    expect(
      await screen.findByRole('heading', { name: 'Crear cuenta de paciente' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('una página protegida se muestra con el menú y un enlace para saltar al contenido', async () => {
    userWithRole('PACIENTE');
    emptyHomeScreens();

    renderWithProviders(<AppRoutes />, { route: '/', withSession: true });

    expect(await screen.findByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });

  it('con un rol no permitido muestra acceso denegado sin perder el menú', async () => {
    userWithRole('ODONTOLOGO');

    renderWithProviders(<AppRoutes />, { route: '/admin/usuarios', withSession: true });

    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso denegado');
    expect(screen.getByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
  });

  it('sin sesión una página protegida redirige al login sin mostrar el menú', async () => {
    renderWithProviders(<AppRoutes />, { route: '/' });

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });
});
