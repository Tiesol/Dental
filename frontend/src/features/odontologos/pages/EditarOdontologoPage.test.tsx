import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testAdminDentist, testService } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { EditarOdontologoPage } from './EditarOdontologoPage';

function renderPage() {
  const dentist = testAdminDentist();
  const statuses: unknown[] = [];
  const assignments: unknown[] = [];
  server.use(
    http.get(`${API}/dentists/d1`, () => HttpResponse.json(dentist)),
    http.get(`${API}/services`, () =>
      HttpResponse.json([
        testService({ id: 's1', nombre: 'Limpieza dental' }),
        testService({ id: 's2', nombre: 'Ortodoncia' }),
      ]),
    ),
    http.put(`${API}/dentists/d1/services`, async ({ request }) => {
      assignments.push(await request.json());
      return HttpResponse.json(dentist);
    }),
    http.patch(`${API}/dentists/d1/estado`, async ({ request }) => {
      const body = (await request.json()) as { activo: boolean };
      statuses.push(body);
      return HttpResponse.json({ ...dentist, activo: body.activo });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/admin/odontologos/:id" element={<EditarOdontologoPage />} />
    </Routes>,
    { route: '/admin/odontologos/d1' },
  );
  return { statuses, assignments };
}

describe('EditarOdontologoPage', () => {
  it('tiene un único encabezado principal', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Editar odontólogo' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('envía los servicios marcados al guardar', async () => {
    const { assignments } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: /Ortodoncia/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar servicios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Servicios actualizados');
    expect(assignments).toEqual([{ serviceIds: ['s1', 's2'] }]);
  });

  it('no deshabilita al odontólogo si se cancela la confirmación', async () => {
    const { statuses } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar odontólogo' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(statuses).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deshabilita al odontólogo al confirmar y lo informa', async () => {
    const { statuses } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar odontólogo' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar odontólogo' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Odontólogo deshabilitado');
    expect(statuses).toEqual([{ activo: false }]);
  });
});
