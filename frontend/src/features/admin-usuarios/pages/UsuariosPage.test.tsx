import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { usuarioDePrueba, usuarioDetalleDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { UsuariosPage } from './UsuariosPage';

const ADMIN = usuarioDetalleDePrueba({
  id: 'admin',
  role: 'ADMIN',
  nombre: 'Administrador',
  email: 'admin@clinica.com',
  paciente: null,
});
const ANA = usuarioDetalleDePrueba({ id: 'u1', nombre: 'Ana Pérez', email: 'ana@mail.com' });

// Registra el listado y devuelve los cuerpos recibidos en PATCH /users/:id/estado.
function apiDeUsuarios(usuarios = [ADMIN, ANA]) {
  const cambios: unknown[] = [];
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json(usuarioDePrueba({ id: 'admin', role: 'ADMIN' })),
    ),
    http.get(`${API}/users`, () => HttpResponse.json(usuarios)),
    http.patch(`${API}/users/:id/estado`, async ({ request, params }) => {
      const body = (await request.json()) as { activo: boolean };
      cambios.push(body);
      const usuario = usuarios.find((u) => u.id === params.id);
      return HttpResponse.json({ ...usuario, activo: body.activo });
    }),
  );
  return cambios;
}

function renderPagina() {
  return renderWithProviders(<UsuariosPage />, { conSesion: true });
}

describe('UsuariosPage', () => {
  it('pide confirmación antes de deshabilitar y no llama a la API si se cancela', async () => {
    const cambios = apiDeUsuarios();
    const user = userEvent.setup();
    renderPagina();
    const fila = await screen.findByTestId('usuario-u1');

    await user.click(within(fila).getByRole('button', { name: 'Deshabilitar' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Deshabilitar a Ana Pérez?' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(cambios).toEqual([]);
    expect(within(fila).getByText('Habilitado')).toBeInTheDocument();
  });

  it('al confirmar deshabilita al usuario y actualiza su estado en la fila', async () => {
    const cambios = apiDeUsuarios();
    const user = userEvent.setup();
    renderPagina();
    const fila = await screen.findByTestId('usuario-u1');

    await user.click(within(fila).getByRole('button', { name: 'Deshabilitar' }));
    const dialogo = screen.getByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Deshabilitar' }));

    expect(await within(fila).findByText('Deshabilitado')).toBeInTheDocument();
    expect(cambios).toEqual([{ activo: false }]);
  });

  it('habilitar no pide confirmación', async () => {
    const cambios = apiDeUsuarios([ADMIN, { ...ANA, activo: false }]);
    const user = userEvent.setup();
    renderPagina();
    const fila = await screen.findByTestId('usuario-u1');

    await user.click(within(fila).getByRole('button', { name: 'Habilitar' }));

    expect(await within(fila).findByText('Habilitado')).toBeInTheDocument();
    expect(cambios).toEqual([{ activo: true }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el ADMIN no puede deshabilitar su propia cuenta', async () => {
    apiDeUsuarios();
    renderPagina();

    const fila = await screen.findByTestId('usuario-admin');

    expect(within(fila).getByRole('button', { name: 'Deshabilitar' })).toBeDisabled();
  });

  it('muestra cuántos usuarios coinciden con la búsqueda', async () => {
    apiDeUsuarios();
    const user = userEvent.setup();
    renderPagina();
    await screen.findByTestId('usuario-u1');

    await user.type(screen.getByLabelText('Buscar'), 'ana');

    expect(screen.getByText('Mostrando 1 de 2 usuarios')).toBeInTheDocument();
    expect(screen.queryByTestId('usuario-admin')).not.toBeInTheDocument();
  });

  it('muestra un estado vacío cuando nada coincide con la búsqueda', async () => {
    apiDeUsuarios();
    const user = userEvent.setup();
    renderPagina();
    await screen.findByTestId('usuario-u1');

    await user.type(screen.getByLabelText('Buscar'), 'zzz');

    expect(
      screen.getByRole('heading', { name: 'No hay usuarios que coincidan' }),
    ).toBeInTheDocument();
  });

  it('muestra el error del backend si no se puede cargar el listado', async () => {
    apiDeUsuarios();
    server.use(
      http.get(`${API}/users`, () =>
        HttpResponse.json({ statusCode: 403, message: 'No autorizado' }, { status: 403 }),
      ),
    );
    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado');
  });
});
