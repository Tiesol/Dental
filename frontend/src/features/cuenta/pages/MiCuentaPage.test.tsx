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
  it('se titula Mi cuenta e indica con qué email se inició sesión, sin un resumen aparte', async () => {
    renderConPerfil(usuarioDetalleDePrueba({ email: 'ana@mail.com' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeVisible();
    expect(screen.getByText('Sesión iniciada como ana@mail.com')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tus datos' })).not.toBeInTheDocument();
    expect(screen.queryByText('Miembro desde')).not.toBeInTheDocument();
  });

  it('el PACIENTE ve sus datos ya cargados en el formulario, listos para cambiarlos', async () => {
    renderConPerfil(
      usuarioDetalleDePrueba({
        paciente: { nombre: 'Ana', apellido: 'Pérez', telefono: '+59170000000' },
      }),
    );

    expect(await screen.findByRole('form', { name: 'Datos personales' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana');
    expect(screen.getByLabelText('Apellido')).toHaveValue('Pérez');
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('+59170000000');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Contraseña' })).toBeInTheDocument();
  });

  it('el ADMIN no tiene perfil que editar, solo puede cambiar su contraseña', async () => {
    renderConPerfil(
      usuarioDetalleDePrueba({ role: 'ADMIN', nombre: 'Administrador', paciente: null }),
    );

    expect(await screen.findByRole('form', { name: 'Contraseña' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Datos personales' })).not.toBeInTheDocument();
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
