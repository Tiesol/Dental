import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import type { AppointmentResponse } from '@/api/types';
import { citaDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { AgendaPage } from './AgendaPage';

function renderPagina(hoy: AppointmentResponse[], proximas: AppointmentResponse[]) {
  server.use(
    http.get(`${API}/dentists/me/agenda`, () => HttpResponse.json(hoy)),
    http.get(`${API}/dentists/me/agenda/upcoming`, () => HttpResponse.json(proximas)),
  );
  renderWithProviders(<AgendaPage />, { route: '/agenda' });
}

const deHoy = citaDePrueba({
  id: 'hoy',
  estado: 'CONFIRMADA',
  horaInicio: '2026-11-09T13:00:00.000Z',
  horaFin: '2026-11-09T13:30:00.000Z',
});
const manana = citaDePrueba({ id: 'manana' });

describe('AgendaPage', () => {
  it('separa las citas de hoy de las próximas', async () => {
    renderPagina([deHoy], [manana]);

    const hoy = await screen.findByRole('region', { name: 'Hoy' });
    const proximas = await screen.findByRole('region', { name: 'Próximas' });

    expect(within(hoy).getByTestId('cita-hoy')).toBeInTheDocument();
    expect(within(proximas).getByTestId('cita-manana')).toBeInTheDocument();
  });

  it('cada cita muestra paciente, servicio, horario y estado', async () => {
    renderPagina([deHoy], []);

    const cita = await screen.findByTestId('cita-hoy');

    expect(cita).toHaveTextContent('Ana Pérez');
    expect(cita).toHaveTextContent('Limpieza dental');
    expect(cita).toHaveTextContent('09:00 - 09:30');
    expect(cita).toHaveTextContent('CONFIRMADA');
  });

  it('muestra la observación si la cita ya la tiene', async () => {
    renderPagina(
      [
        {
          ...deHoy,
          estado: 'FINALIZADA',
          observacion: { texto: 'Sin novedades', createdAt: '2026-11-09T14:00:00.000Z' },
        },
      ],
      [],
    );

    expect(await screen.findByText('Sin novedades')).toBeInTheDocument();
  });

  it('no repite en Próximas una cita que ya está en Hoy', async () => {
    renderPagina([deHoy], [deHoy, manana]);

    const proximas = await screen.findByRole('region', { name: 'Próximas' });

    expect(await within(proximas).findByTestId('cita-manana')).toBeInTheDocument();
    expect(within(proximas).queryByTestId('cita-hoy')).not.toBeInTheDocument();
  });

  it('conserva el orden que devuelve el backend', async () => {
    const primera = { ...deHoy, id: 'primera' };
    const segunda = { ...deHoy, id: 'segunda' };
    renderPagina([primera, segunda], []);

    const hoy = await screen.findByRole('region', { name: 'Hoy' });
    await within(hoy).findByTestId('cita-primera');

    const filas = within(hoy).getAllByTestId(/^cita-/);
    expect(filas.map((f) => f.getAttribute('data-testid'))).toEqual([
      'cita-primera',
      'cita-segunda',
    ]);
  });

  it('cada cita enlaza a su atención', async () => {
    renderPagina([deHoy], []);

    await screen.findByTestId('cita-hoy');

    expect(screen.getByRole('link', { name: 'Abrir cita de Ana Pérez' })).toHaveAttribute(
      'href',
      '/agenda/hoy',
    );
  });

  it('avisa si no hay citas', async () => {
    renderPagina([], []);

    expect(await screen.findByText('No tienes citas para hoy')).toBeInTheDocument();
    expect(await screen.findByText('No tienes citas próximas')).toBeInTheDocument();
  });

  it('muestra el error si no se puede cargar', async () => {
    renderPagina([], []);
    server.use(
      http.get(`${API}/dentists/me/agenda`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    );

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent('Falló el servidor');
  });
});
