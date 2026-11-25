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
  it('el ADMIN ve Citas, Usuarios, Servicios y Odontólogos', async () => {
    renderConRol('ADMIN');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Citas', 'Usuarios', 'Servicios', 'Odontólogos']);
  });

  it('el PACIENTE ve Mis citas, Servicios y Odontólogos: reserva desde los catálogos', async () => {
    renderConRol('PACIENTE');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Mis citas', 'Servicios', 'Odontólogos']);
  });

  it('el ODONTOLOGO ve Agenda', async () => {
    renderConRol('ODONTOLOGO');

    await screen.findByRole('navigation', { name: 'Principal' });

    expect(enlacesDelMenu()).toEqual(['Agenda']);
  });

  it('muestra el nombre del usuario, sus iniciales y su rol', async () => {
    renderConRol('ODONTOLOGO', 'Dr. Juan Rojas');

    expect(await screen.findByText('Dr. Juan Rojas')).toBeInTheDocument();
    expect(screen.getByText('JR')).toBeInTheDocument();
    expect(screen.getByText('Odontólogo')).toBeInTheDocument();
  });

  it('el nombre del usuario, al pie del menú, lleva a Mi cuenta', async () => {
    renderConRol('PACIENTE');

    const enlace = await screen.findByRole('link', { name: /Mi cuenta/ });

    expect(enlace).toHaveAttribute('href', '/mi-cuenta');
    expect(enlace).toHaveTextContent('Ana Pérez');
    expect(enlace).toHaveTextContent('Paciente');
  });

  it('Cerrar sesión borra el token y quita el menú', async () => {
    const user = userEvent.setup();
    renderConRol('PACIENTE');

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(tokenStore.get()).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });
});
