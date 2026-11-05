import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { usuarioDePrueba, usuarioDetalleDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { EditarUsuarioPage } from './EditarUsuarioPage';

function renderPagina() {
  const usuario = usuarioDetalleDePrueba({ id: 'u1' });
  const cambios: unknown[] = [];
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json(usuarioDePrueba({ id: 'admin', role: 'ADMIN' })),
    ),
    http.get(`${API}/users/u1`, () => HttpResponse.json(usuario)),
    http.patch(`${API}/users/u1/estado`, async ({ request }) => {
      const body = (await request.json()) as { activo: boolean };
      cambios.push(body);
      return HttpResponse.json({ ...usuario, activo: body.activo });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/admin/usuarios/:id" element={<EditarUsuarioPage />} />
    </Routes>,
    { route: '/admin/usuarios/u1', conSesion: true },
  );
  return cambios;
}

describe('EditarUsuarioPage', () => {
  it('no deshabilita la cuenta si se cancela la confirmación', async () => {
    const cambios = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar cuenta' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(cambios).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deshabilita la cuenta al confirmar y lo informa', async () => {
    const cambios = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar cuenta' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar cuenta' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Cuenta deshabilitada');
    expect(cambios).toEqual([{ activo: false }]);
  });
});
