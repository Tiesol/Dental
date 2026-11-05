import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import type { DentistAdminResponse } from '@/api/types';
import { odontologoAdminDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { AdminOdontologosPage } from './AdminOdontologosPage';

function apiDeOdontologos(odontologos: DentistAdminResponse[] = [odontologoAdminDePrueba()]) {
  const cambios: unknown[] = [];
  server.use(
    http.get(`${API}/dentists`, () => HttpResponse.json(odontologos)),
    http.patch(`${API}/dentists/:id/estado`, async ({ request, params }) => {
      const body = (await request.json()) as { activo: boolean };
      cambios.push(body);
      const odontologo = odontologos.find((d) => d.id === params.id);
      return HttpResponse.json({ ...odontologo, activo: body.activo });
    }),
  );
  return cambios;
}

describe('AdminOdontologosPage', () => {
  it('muestra los datos del odontólogo y los servicios que realiza', async () => {
    apiDeOdontologos();

    renderWithProviders(<AdminOdontologosPage />);

    const fila = within(await screen.findByTestId('odontologo-d1'));
    expect(fila.getByText('Dra. Laura Gómez')).toBeInTheDocument();
    expect(fila.getByText('laura@clinica.com')).toBeInTheDocument();
    expect(fila.getByText('Limpieza dental')).toBeInTheDocument();
    expect(fila.getByText('Acepta citas')).toBeInTheDocument();
  });

  it('avisa cuando la cuenta de acceso está deshabilitada', async () => {
    apiDeOdontologos([odontologoAdminDePrueba({ cuentaActiva: false })]);

    renderWithProviders(<AdminOdontologosPage />);

    const fila = within(await screen.findByTestId('odontologo-d1'));
    expect(fila.getByText('Cuenta deshabilitada')).toBeInTheDocument();
  });

  it('no deshabilita al odontólogo si se cancela la confirmación', async () => {
    const cambios = apiDeOdontologos();
    const user = userEvent.setup();
    renderWithProviders(<AdminOdontologosPage />);
    const fila = await screen.findByTestId('odontologo-d1');

    await user.click(within(fila).getByRole('button', { name: 'Deshabilitar' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Deshabilitar a Dra. Laura Gómez?' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(cambios).toEqual([]);
    expect(within(fila).getByText('Acepta citas')).toBeInTheDocument();
  });

  it('deshabilita al odontólogo al confirmar', async () => {
    const cambios = apiDeOdontologos();
    const user = userEvent.setup();
    renderWithProviders(<AdminOdontologosPage />);
    const fila = await screen.findByTestId('odontologo-d1');

    await user.click(within(fila).getByRole('button', { name: 'Deshabilitar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar' }),
    );

    expect(await within(fila).findByText('Deshabilitado')).toBeInTheDocument();
    expect(cambios).toEqual([{ activo: false }]);
  });

  it('muestra un estado vacío cuando no hay odontólogos', async () => {
    apiDeOdontologos([]);

    renderWithProviders(<AdminOdontologosPage />);

    expect(
      await screen.findByRole('heading', { name: 'Todavía no hay odontólogos registrados' }),
    ).toBeInTheDocument();
  });
});
