import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { describe, expect, it } from 'vitest';
import { citaDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { MisCitasPage } from './MisCitasPage';

function renderPagina(extras: RequestHandler[] = []) {
  server.use(
    http.get(`${API}/appointments/mine`, ({ request }) => {
      const cuando = new URL(request.url).searchParams.get('cuando');
      return HttpResponse.json(
        cuando === 'proximas'
          ? [citaDePrueba({ id: 'proxima' })]
          : [
              citaDePrueba({
                id: 'pasada',
                estado: 'FINALIZADA',
                horaInicio: '2026-11-03T13:00:00.000Z',
                horaFin: '2026-11-03T13:30:00.000Z',
              }),
            ],
      );
    }),
  );
  server.use(...extras);
  renderWithProviders(<MisCitasPage />, { route: '/mis-citas' });
}

describe('MisCitasPage', () => {
  it('muestra por defecto las próximas, con servicio, odontólogo, horario y estado', async () => {
    renderPagina();

    const cita = await screen.findByTestId('cita-proxima');

    expect(cita).toHaveTextContent('Limpieza dental');
    expect(cita).toHaveTextContent('Dra. Laura Gómez');
    expect(cita).toHaveTextContent('martes, 10 de noviembre de 2026');
    expect(cita).toHaveTextContent('09:00 - 09:30');
    expect(cita).toHaveTextContent('PENDIENTE');
  });

  it('cambia al historial y muestra las citas anteriores', async () => {
    renderPagina();
    const user = userEvent.setup();
    await screen.findByTestId('cita-proxima');

    await user.click(screen.getByRole('tab', { name: 'Historial' }));

    expect(await screen.findByTestId('cita-pasada')).toHaveTextContent('FINALIZADA');
    expect(screen.queryByTestId('cita-proxima')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true');
  });

  it('la lista queda en un panel asociado a la pestaña activa', async () => {
    renderPagina();
    await screen.findByTestId('cita-proxima');

    const pestania = screen.getByRole('tab', { name: 'Próximas' });
    const panel = screen.getByRole('tabpanel', { name: 'Próximas' });

    expect(pestania).toHaveAttribute('aria-controls', panel.id);
  });

  it('las flechas cambian de pestaña y solo la activa recibe el foco con Tab', async () => {
    renderPagina();
    const user = userEvent.setup();
    await screen.findByTestId('cita-proxima');
    screen.getByRole('tab', { name: 'Próximas' }).focus();

    await user.keyboard('{ArrowRight}');

    const historial = screen.getByRole('tab', { name: 'Historial' });
    expect(historial).toHaveFocus();
    expect(historial).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Próximas' })).toHaveAttribute('tabindex', '-1');
    expect(await screen.findByTestId('cita-pasada')).toBeInTheDocument();
  });

  it('cada cita enlaza a su detalle', async () => {
    renderPagina();

    await screen.findByTestId('cita-proxima');

    expect(screen.getByRole('link', { name: 'Ver detalle de Limpieza dental' })).toHaveAttribute(
      'href',
      '/mis-citas/proxima',
    );
  });

  it('avisa si no hay citas próximas y ofrece reservar', async () => {
    renderPagina([http.get(`${API}/appointments/mine`, () => HttpResponse.json([]))]);

    expect(await screen.findByText('No tienes citas próximas')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Reservar cita' }).length).toBeGreaterThan(0);
  });

  it('avisa si el historial está vacío', async () => {
    renderPagina([http.get(`${API}/appointments/mine`, () => HttpResponse.json([]))]);
    const user = userEvent.setup();
    await screen.findByText('No tienes citas próximas');

    await user.click(screen.getByRole('tab', { name: 'Historial' }));

    expect(await screen.findByText('Tu historial está vacío')).toBeInTheDocument();
  });

  it('muestra el error si no se pueden cargar', async () => {
    renderPagina([
      http.get(`${API}/appointments/mine`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    ]);

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent('Falló el servidor');
  });
});
