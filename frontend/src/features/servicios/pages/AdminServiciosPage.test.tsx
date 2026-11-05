import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { AdminServiciosPage } from './AdminServiciosPage';

function apiDeServicios(servicios = [servicioDePrueba()]) {
  const cambios: unknown[] = [];
  server.use(
    http.get(`${API}/services`, () => HttpResponse.json(servicios)),
    http.patch(`${API}/services/:id/estado`, async ({ request, params }) => {
      const body = (await request.json()) as { activo: boolean };
      cambios.push(body);
      const servicio = servicios.find((s) => s.id === params.id);
      return HttpResponse.json({ ...servicio, activo: body.activo });
    }),
  );
  return cambios;
}

describe('AdminServiciosPage', () => {
  it('no deshabilita el servicio si se cancela la confirmación', async () => {
    const cambios = apiDeServicios();
    const user = userEvent.setup();
    renderWithProviders(<AdminServiciosPage />);
    const fila = await screen.findByTestId('servicio-s1');

    await user.click(within(fila).getByRole('button', { name: 'Deshabilitar' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Deshabilitar "Limpieza dental"?' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(cambios).toEqual([]);
    expect(within(fila).getByText('Habilitado')).toBeInTheDocument();
  });

  it('deshabilita el servicio al confirmar', async () => {
    const cambios = apiDeServicios();
    const user = userEvent.setup();
    renderWithProviders(<AdminServiciosPage />);
    const fila = await screen.findByTestId('servicio-s1');

    await user.click(within(fila).getByRole('button', { name: 'Deshabilitar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar' }),
    );

    expect(await within(fila).findByText('Deshabilitado')).toBeInTheDocument();
    expect(cambios).toEqual([{ activo: false }]);
  });

  it('con el catálogo vacío invita a crear el primer servicio', async () => {
    apiDeServicios([]);

    renderWithProviders(<AdminServiciosPage />);

    expect(
      await screen.findByRole('heading', { name: 'Todavía no hay servicios' }),
    ).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando nada coincide con el filtro', async () => {
    apiDeServicios();
    const user = userEvent.setup();
    renderWithProviders(<AdminServiciosPage />);
    await screen.findByTestId('servicio-s1');

    await user.selectOptions(screen.getByLabelText('Estado'), 'DESHABILITADOS');

    expect(
      screen.getByRole('heading', { name: 'No hay servicios que coincidan' }),
    ).toBeInTheDocument();
  });
});
