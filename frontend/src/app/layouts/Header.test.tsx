import { screen, within } from '@testing-library/react';
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
  const nav = screen.getByRole('navigation', { name: 'Principal' });
  return within(nav)
    .getAllByRole('link')
    .map((a) => a.textContent);
}

describe('Header', () => {
  it('el ADMIN ve Mi cuenta, Citas, Usuarios, Servicios y Odontólogos', async () => {
    renderConRol('ADMIN');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual([
      'Mi cuenta',
      'Citas',
      'Usuarios',
      'Servicios',
      'Odontólogos',
    ]);
  });

  it('el PACIENTE ve Mi cuenta, Servicios, Odontólogos, Reservar cita y Mis citas', async () => {
    renderConRol('PACIENTE');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual([
      'Mi cuenta',
      'Servicios',
      'Odontólogos',
      'Reservar cita',
      'Mis citas',
    ]);
  });

  it('el ODONTOLOGO ve Mi cuenta y Agenda', async () => {
    renderConRol('ODONTOLOGO');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Mi cuenta', 'Agenda']);
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
