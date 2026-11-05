import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { EditarServicioPage } from './EditarServicioPage';

function renderPagina() {
  const servicio = servicioDePrueba();
  const cambios: unknown[] = [];
  server.use(
    http.get(`${API}/services/s1`, () => HttpResponse.json(servicio)),
    http.patch(`${API}/services/s1/estado`, async ({ request }) => {
      const body = (await request.json()) as { activo: boolean };
      cambios.push(body);
      return HttpResponse.json({ ...servicio, activo: body.activo });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/admin/servicios/:id" element={<EditarServicioPage />} />
    </Routes>,
    { route: '/admin/servicios/s1' },
  );
  return cambios;
}

describe('EditarServicioPage', () => {
  it('no deshabilita el servicio si se cancela la confirmación', async () => {
    const cambios = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar servicio' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(cambios).toEqual([]);
  });

  it('deshabilita el servicio al confirmar y cambia el estado mostrado', async () => {
    const cambios = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar servicio' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar servicio' }),
    );

    expect(await screen.findByText('Deshabilitado')).toBeInTheDocument();
    expect(cambios).toEqual([{ activo: false }]);
  });
});
