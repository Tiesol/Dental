import { screen, within } from '@testing-library/react';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { describe, expect, it } from 'vitest';
import type { AppointmentResponse } from '@/api/types';
import { testAppointment } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { AgendaPage } from './AgendaPage';

function renderPage(
  today: AppointmentResponse[],
  upcoming: AppointmentResponse[],
  extras: RequestHandler[] = [],
) {
  server.use(
    http.get(`${API}/dentists/me/agenda`, () => HttpResponse.json(today)),
    http.get(`${API}/dentists/me/agenda/upcoming`, () => HttpResponse.json(upcoming)),
  );
  server.use(...extras);
  renderWithProviders(<AgendaPage />, { route: '/agenda' });
}

const forToday = testAppointment({
  id: 'hoy',
  estado: 'CONFIRMADA',
  horaInicio: '2026-11-09T13:00:00.000Z',
  horaFin: '2026-11-09T13:30:00.000Z',
});
const tomorrow = testAppointment({ id: 'manana' });

describe('AgendaPage', () => {
  it('separa las citas de hoy de las próximas', async () => {
    renderPage([forToday], [tomorrow]);

    const today = await screen.findByRole('region', { name: 'Hoy' });
    const upcoming = await screen.findByRole('region', { name: 'Próximas' });

    expect(within(today).getByTestId('cita-hoy')).toBeInTheDocument();
    expect(within(upcoming).getByTestId('cita-manana')).toBeInTheDocument();
  });

  it('cada cita muestra paciente, servicio, horario y estado', async () => {
    renderPage([forToday], []);

    const appointment = await screen.findByTestId('cita-hoy');

    expect(appointment).toHaveTextContent('Ana Pérez');
    expect(appointment).toHaveTextContent('Limpieza dental');
    expect(appointment).toHaveTextContent('09:00 - 09:30');
    expect(appointment).toHaveTextContent('CONFIRMADA');
  });

  it('muestra la observación si la cita ya la tiene', async () => {
    renderPage(
      [
        {
          ...forToday,
          estado: 'FINALIZADA',
          observacion: { texto: 'Sin novedades', createdAt: '2026-11-09T14:00:00.000Z' },
        },
      ],
      [],
    );

    expect(await screen.findByText('Sin novedades')).toBeInTheDocument();
  });

  it('no repite en Próximas una cita que ya está en Hoy', async () => {
    renderPage([forToday], [forToday, tomorrow]);

    const upcoming = await screen.findByRole('region', { name: 'Próximas' });

    expect(await within(upcoming).findByTestId('cita-manana')).toBeInTheDocument();
    expect(within(upcoming).queryByTestId('cita-hoy')).not.toBeInTheDocument();
  });

  it('conserva el orden que devuelve el backend', async () => {
    const first = { ...forToday, id: 'primera' };
    const second = { ...forToday, id: 'segunda' };
    renderPage([first, second], []);

    const today = await screen.findByRole('region', { name: 'Hoy' });
    await within(today).findByTestId('cita-primera');

    const rows = within(today).getAllByTestId(/^cita-/);
    expect(rows.map((f) => f.getAttribute('data-testid'))).toEqual([
      'cita-primera',
      'cita-segunda',
    ]);
  });

  it('cada cita enlaza a su atención', async () => {
    renderPage([forToday], []);

    await screen.findByTestId('cita-hoy');

    expect(screen.getByRole('link', { name: 'Abrir cita de Ana Pérez' })).toHaveAttribute(
      'href',
      '/agenda/hoy',
    );
  });

  it('avisa si no hay citas', async () => {
    renderPage([], []);

    expect(await screen.findByText('No tienes citas para hoy')).toBeInTheDocument();
    expect(await screen.findByText('No tienes citas próximas')).toBeInTheDocument();
  });

  it('muestra el error si no se puede cargar', async () => {
    renderPage(
      [],
      [],
      [
        http.get(`${API}/dentists/me/agenda`, () =>
          HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
        ),
      ],
    );

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent('Falló el servidor');
  });
});
