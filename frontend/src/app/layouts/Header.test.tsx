import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '@/api/token';
import { usuarioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { Header } from './Header';

function renderConRol(role: 'PACIENTE' | 'ODONTOLOGO' | 'ADMIN', nombre = 'Ana Pérez') {
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json(usuarioDePrueba({ role, nombre }))),
  );
  return renderWithProviders(<Header />, { conSesion: true });
}

function enlacesDelMenu() {
  return screen
    .getAllByRole('link', { name: /Mi cuenta|Usuarios|Servicios|Odontólogos/ })
    .map((a) => a.textContent);
}

describe('Header', () => {
  it('el ADMIN ve Mi cuenta, Usuarios, Servicios y Odontólogos', async () => {
    renderConRol('ADMIN');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Mi cuenta', 'Usuarios', 'Servicios', 'Odontólogos']);
  });

  it('el PACIENTE ve Mi cuenta, Servicios y Odontólogos, pero no Usuarios', async () => {
    renderConRol('PACIENTE');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Mi cuenta', 'Servicios', 'Odontólogos']);
  });

  it('el ODONTOLOGO ve solo Mi cuenta', async () => {
    renderConRol('ODONTOLOGO');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Mi cuenta']);
  });

  it('muestra el nombre del usuario, sus iniciales y su rol', async () => {
    renderConRol('ODONTOLOGO', 'Dr. Juan Rojas');

    expect(await screen.findByText('Dr. Juan Rojas')).toBeInTheDocument();
    expect(screen.getByText('JR')).toBeInTheDocument();
    expect(screen.getByText('Odontólogo')).toBeInTheDocument();
  });

  it('Cerrar sesión borra el token y quita el menú', async () => {
    const user = userEvent.setup();
    renderConRol('PACIENTE');

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(tokenStore.get()).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });
});
