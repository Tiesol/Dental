import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { testService } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { chooseOption, renderWithProviders } from '@/test/utils';
import { AdminServiciosPage } from './AdminServiciosPage';

function mockServicesApi(services = [testService()]) {
  const changes: unknown[] = [];
  server.use(
    http.get(`${API}/services`, () => HttpResponse.json(services)),
    http.patch(`${API}/services/:id/estado`, async ({ request, params }) => {
      const body = (await request.json()) as { activo: boolean };
      changes.push(body);
      const service = services.find((s) => s.id === params.id);
      return HttpResponse.json({ ...service, activo: body.activo });
    }),
  );
  return changes;
}

describe('AdminServiciosPage', () => {
  it('no deshabilita el servicio si se cancela la confirmación', async () => {
    const changes = mockServicesApi();
    const user = userEvent.setup();
    renderWithProviders(<AdminServiciosPage />);
    const row = await screen.findByTestId('servicio-s1');

    await user.click(within(row).getByRole('button', { name: 'Deshabilitar' }));
    const dialog = screen.getByRole('dialog', { name: '¿Deshabilitar "Limpieza dental"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(changes).toEqual([]);
    expect(within(row).getByText('Habilitado')).toBeInTheDocument();
  });

  it('deshabilita el servicio al confirmar', async () => {
    const changes = mockServicesApi();
    const user = userEvent.setup();
    renderWithProviders(<AdminServiciosPage />);
    const row = await screen.findByTestId('servicio-s1');

    await user.click(within(row).getByRole('button', { name: 'Deshabilitar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar' }),
    );

    expect(await within(row).findByText('Deshabilitado')).toBeInTheDocument();
    expect(changes).toEqual([{ activo: false }]);
  });

  it('con el catálogo vacío invita a crear el primer servicio', async () => {
    mockServicesApi([]);

    renderWithProviders(<AdminServiciosPage />);

    expect(
      await screen.findByRole('heading', { name: 'Todavía no hay servicios' }),
    ).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando nada coincide con el filtro', async () => {
    mockServicesApi();
    const user = userEvent.setup();
    renderWithProviders(<AdminServiciosPage />);
    await screen.findByTestId('servicio-s1');

    await chooseOption(user, screen.getByLabelText('Estado'), 'Deshabilitados');

    expect(
      screen.getByRole('heading', { name: 'No hay servicios que coincidan' }),
    ).toBeInTheDocument();
  });
});
