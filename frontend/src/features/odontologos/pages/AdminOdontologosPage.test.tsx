import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import type { DentistAdminResponse } from '@/api/types';
import { testAdminDentist } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { AdminOdontologosPage } from './AdminOdontologosPage';

function mockDentistsApi(dentists: DentistAdminResponse[] = [testAdminDentist()]) {
  const changes: unknown[] = [];
  server.use(
    http.get(`${API}/dentists`, () => HttpResponse.json(dentists)),
    http.patch(`${API}/dentists/:id/estado`, async ({ request, params }) => {
      const body = (await request.json()) as { activo: boolean };
      changes.push(body);
      const dentist = dentists.find((d) => d.id === params.id);
      return HttpResponse.json({ ...dentist, activo: body.activo });
    }),
  );
  return changes;
}

describe('AdminOdontologosPage', () => {
  it('muestra los datos del odontólogo y los servicios que realiza', async () => {
    mockDentistsApi();

    renderWithProviders(<AdminOdontologosPage />);

    const row = within(await screen.findByTestId('odontologo-d1'));
    expect(row.getByText('Dra. Laura Gómez')).toBeInTheDocument();
    expect(row.getByText('laura@clinica.com')).toBeInTheDocument();
    expect(row.getByText('Limpieza dental')).toBeInTheDocument();
    expect(row.getByText('Acepta citas')).toBeInTheDocument();
  });

  it('avisa cuando la cuenta de acceso está deshabilitada', async () => {
    mockDentistsApi([testAdminDentist({ cuentaActiva: false })]);

    renderWithProviders(<AdminOdontologosPage />);

    const row = within(await screen.findByTestId('odontologo-d1'));
    expect(row.getByText('Cuenta deshabilitada')).toBeInTheDocument();
  });

  it('no deshabilita al odontólogo si se cancela la confirmación', async () => {
    const changes = mockDentistsApi();
    const user = userEvent.setup();
    renderWithProviders(<AdminOdontologosPage />);
    const row = await screen.findByTestId('odontologo-d1');

    await user.click(within(row).getByRole('button', { name: 'Deshabilitar' }));
    const dialog = screen.getByRole('dialog', { name: '¿Deshabilitar a Dra. Laura Gómez?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(changes).toEqual([]);
    expect(within(row).getByText('Acepta citas')).toBeInTheDocument();
  });

  it('deshabilita al odontólogo al confirmar', async () => {
    const changes = mockDentistsApi();
    const user = userEvent.setup();
    renderWithProviders(<AdminOdontologosPage />);
    const row = await screen.findByTestId('odontologo-d1');

    await user.click(within(row).getByRole('button', { name: 'Deshabilitar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar' }),
    );

    expect(await within(row).findByText('Deshabilitado')).toBeInTheDocument();
    expect(changes).toEqual([{ activo: false }]);
  });

  it('muestra un estado vacío cuando no hay odontólogos', async () => {
    mockDentistsApi([]);

    renderWithProviders(<AdminOdontologosPage />);

    expect(
      await screen.findByRole('heading', { name: 'Todavía no hay odontólogos registrados' }),
    ).toBeInTheDocument();
  });
});
