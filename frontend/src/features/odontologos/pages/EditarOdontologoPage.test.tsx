import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { odontologoAdminDePrueba, servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { EditarOdontologoPage } from './EditarOdontologoPage';

function renderPagina() {
  const odontologo = odontologoAdminDePrueba();
  const estados: unknown[] = [];
  const asignaciones: unknown[] = [];
  server.use(
    http.get(`${API}/dentists/d1`, () => HttpResponse.json(odontologo)),
    http.get(`${API}/services`, () =>
      HttpResponse.json([
        servicioDePrueba({ id: 's1', nombre: 'Limpieza dental' }),
        servicioDePrueba({ id: 's2', nombre: 'Ortodoncia' }),
      ]),
    ),
    http.put(`${API}/dentists/d1/services`, async ({ request }) => {
      asignaciones.push(await request.json());
      return HttpResponse.json(odontologo);
    }),
    http.patch(`${API}/dentists/d1/estado`, async ({ request }) => {
      const body = (await request.json()) as { activo: boolean };
      estados.push(body);
      return HttpResponse.json({ ...odontologo, activo: body.activo });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/admin/odontologos/:id" element={<EditarOdontologoPage />} />
    </Routes>,
    { route: '/admin/odontologos/d1' },
  );
  return { estados, asignaciones };
}

describe('EditarOdontologoPage', () => {
  it('tiene un único encabezado principal', async () => {
    renderPagina();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Editar odontólogo' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('envía los servicios marcados al guardar', async () => {
    const { asignaciones } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: /Ortodoncia/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar servicios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Servicios actualizados');
    expect(asignaciones).toEqual([{ serviceIds: ['s1', 's2'] }]);
  });

  it('no deshabilita al odontólogo si se cancela la confirmación', async () => {
    const { estados } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar odontólogo' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(estados).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deshabilita al odontólogo al confirmar y lo informa', async () => {
    const { estados } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar odontólogo' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deshabilitar odontólogo' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Odontólogo deshabilitado');
    expect(estados).toEqual([{ activo: false }]);
  });
});
