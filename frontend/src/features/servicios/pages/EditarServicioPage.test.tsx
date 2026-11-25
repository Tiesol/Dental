import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testService } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { EditarServicioPage } from './EditarServicioPage';

function renderPage() {
  const service = testService();
  const changes: unknown[] = [];
  server.use(
    http.get(`${API}/services/s1`, () => HttpResponse.json(service)),
    http.patch(`${API}/services/s1/estado`, async ({ request }) => {
      const body = (await request.json()) as { activo: boolean };
      changes.push(body);
      return HttpResponse.json({ ...service, activo: body.activo });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/admin/servicios/:id" element={<EditarServicioPage />} />
    </Routes>,
    { route: '/admin/servicios/s1' },
  );
  return changes;
}

describe('EditarServicioPage', () => {
  it('no deshabilita el servicio si se cancela la confirmación', async () => {
    const changes = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar servicio' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(changes).toEqual([]);
  });

  it('deshabilita el servicio al confirmar y cambia el estado mostrado', async () => {
    const changes = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar servicio' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar servicio' }),
    );

    expect(await screen.findByText('Deshabilitado')).toBeInTheDocument();
    expect(changes).toEqual([{ activo: false }]);
  });
});
