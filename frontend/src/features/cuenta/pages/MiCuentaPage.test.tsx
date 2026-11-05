import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import type { UserDetail } from '@/api/types';
import { usuarioDetalleDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { MiCuentaPage } from './MiCuentaPage';

function renderConPerfil(perfil: UserDetail) {
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json(perfil)),
    http.get(`${API}/users/me`, () => HttpResponse.json(perfil)),
  );
  return renderWithProviders(<MiCuentaPage />, { conSesion: true });
}

describe('MiCuentaPage', () => {
  it('saluda al usuario y resume sus datos', async () => {
    renderConPerfil(
      usuarioDetalleDePrueba({
        nombre: 'Ana Pérez',
        paciente: { nombre: 'Ana', apellido: 'Pérez', telefono: '+59170000000' },
      }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana Pérez' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Tus datos' })).toBeInTheDocument();
    expect(await screen.findByText('+59170000000')).toBeInTheDocument();
    expect(screen.getByText('Paciente')).toBeInTheDocument();
  });

  it('el PACIENTE puede editar su perfil y cambiar su contraseña', async () => {
    renderConPerfil(usuarioDetalleDePrueba());

    expect(await screen.findByRole('form', { name: 'Editar perfil' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('el ADMIN no tiene perfil que editar, solo puede cambiar su contraseña', async () => {
    renderConPerfil(
      usuarioDetalleDePrueba({ role: 'ADMIN', nombre: 'Administrador', paciente: null }),
    );

    expect(await screen.findByRole('form', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Editar perfil' })).not.toBeInTheDocument();
  });

  it('muestra el error si no se puede cargar el perfil', async () => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json(usuarioDetalleDePrueba())),
      http.get(`${API}/users/me`, () => HttpResponse.error()),
    );

    renderWithProviders(<MiCuentaPage />, { conSesion: true });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    );
  });
});
