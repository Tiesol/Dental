import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { AppointmentResponse } from '@/api/types';
import { testAppointment, testAdminDentist, testUser } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { chooseOption, renderWithProviders } from '@/test/utils';
import { AdminCitasPage } from './AdminCitasPage';

function renderPage(
  initials: AppointmentResponse[] = [testAppointment()],
  extras: RequestHandler[] = [],
) {
  let appointments = initials;
  const requests = vi.fn();
  const changes: unknown[] = [];
  const cancellations: string[] = [];
  const update = (id: string, status: AppointmentResponse['estado']) => {
    appointments = appointments.map((c) => (c.id === id ? { ...c, estado: status } : c));
    return appointments.find((c) => c.id === id);
  };
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json(testUser({ role: 'ADMIN', patientId: undefined })),
    ),
    http.get(`${API}/dentists`, () => HttpResponse.json([testAdminDentist()])),
    http.get(`${API}/appointments`, ({ request }) => {
      requests(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json(appointments);
    }),
    http.patch(`${API}/appointments/:id/status`, async ({ request, params }) => {
      const body = (await request.json()) as { estado: AppointmentResponse['estado'] };
      changes.push({ id: params.id, ...body });
      return HttpResponse.json(update(params.id as string, body.estado));
    }),
    http.patch(`${API}/appointments/:id/cancel`, ({ params }) => {
      cancellations.push(params.id as string);
      return HttpResponse.json(update(params.id as string, 'CANCELADA'));
    }),
  );
  server.use(...extras);
  renderWithProviders(<AdminCitasPage />, { route: '/admin/citas', withSession: true });
  return { requests, changes, cancellations };
}

describe('AdminCitasPage', () => {
  it('lista las citas con paciente, odontólogo, servicio, horario y estado', async () => {
    renderPage();

    const row = await screen.findByTestId('cita-c1');

    expect(row).toHaveTextContent('Ana Pérez');
    expect(row).toHaveTextContent('Dra. Laura Gómez');
    expect(row).toHaveTextContent('Limpieza dental');
    expect(row).toHaveTextContent('09:00 - 09:30');
    expect(row).toHaveTextContent('PENDIENTE');
  });

  it('consulta las citas con el límite de una página', async () => {
    const { requests } = renderPage();

    await screen.findByTestId('cita-c1');

    expect(requests).toHaveBeenLastCalledWith({ limit: '50', offset: '0' });
  });

  it('una cita PENDIENTE ofrece confirmar y cancelar', async () => {
    renderPage();

    const row = await screen.findByTestId('cita-c1');

    expect(await within(row).findByTestId('btn-confirmar')).toBeInTheDocument();
    expect(within(row).getByTestId('btn-cancelar')).toBeInTheDocument();
  });

  it('una cita CONFIRMADA solo ofrece cancelar', async () => {
    renderPage([testAppointment({ estado: 'CONFIRMADA' })]);

    const row = await screen.findByTestId('cita-c1');

    expect(await within(row).findByTestId('btn-cancelar')).toBeInTheDocument();
    expect(within(row).queryByTestId('btn-confirmar')).not.toBeInTheDocument();
  });

  it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
    'una cita %s no ofrece acciones',
    async (status) => {
      renderPage([testAppointment({ estado: status })]);

      const row = await screen.findByTestId('cita-c1');
      await screen.findByRole('heading', { level: 1 });

      expect(within(row).queryByTestId('btn-confirmar')).not.toBeInTheDocument();
      expect(within(row).queryByTestId('btn-cancelar')).not.toBeInTheDocument();
    },
  );

  it('confirma una cita y actualiza su estado', async () => {
    const { changes } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-confirmar'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CONFIRMADA'));
    expect(changes).toEqual([{ id: 'c1', estado: 'CONFIRMADA' }]);
  });

  it('cancela una cita tras confirmar en el diálogo', async () => {
    const { cancellations } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar cita' }),
    );

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(cancellations).toEqual(['c1']);
  });

  it('no cancela si se desiste en el diálogo', async () => {
    const { cancellations } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver' }));

    expect(cancellations).toEqual([]);
  });

  it('muestra el mensaje del backend si una acción falla', async () => {
    renderPage();
    server.use(
      http.patch(`${API}/appointments/:id/status`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'TRANSICION_DE_ESTADO_INVALIDA',
            message: 'Una cita CANCELADA no puede pasar a CONFIRMADA',
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-confirmar'));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Una cita CANCELADA no puede pasar a CONFIRMADA',
    );
  });

  it('si una acción falla, vuelve a consultar y muestra el estado real', async () => {
    let changed = false;
    renderPage(undefined, [
      http.patch(`${API}/appointments/:id/status`, () => {
        changed = true;
        return HttpResponse.json(
          { statusCode: 409, error: 'TRANSICION_DE_ESTADO_INVALIDA', message: 'No se puede' },
          { status: 409 },
        );
      }),
      http.get(`${API}/appointments`, () =>
        HttpResponse.json([testAppointment({ estado: changed ? 'CANCELADA' : 'PENDIENTE' })]),
      ),
    ]);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-confirmar'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(screen.getByTestId('error-mensaje')).toHaveTextContent('No se puede');
  });

  it('filtra por fecha, estado y odontólogo', async () => {
    const { requests } = renderPage();
    const user = userEvent.setup();
    await screen.findByTestId('cita-c1');

    await user.type(screen.getByLabelText('Fecha'), '10/11/2026');
    await chooseOption(user, screen.getByLabelText('Estado'), 'CONFIRMADA');
    await chooseOption(user, await screen.findByLabelText('Odontólogo'), 'Dra. Laura Gómez');

    await waitFor(() =>
      expect(requests).toHaveBeenLastCalledWith({
        fecha: '2026-11-10',
        estado: 'CONFIRMADA',
        dentistId: 'd1',
        limit: '50',
        offset: '0',
      }),
    );
  });

  it('avanza de página cuando la actual está llena y vuelve a la primera al filtrar', async () => {
    const full = Array.from({ length: 50 }, (_, i) => testAppointment({ id: `c${i}` }));
    const { requests } = renderPage(full);
    const user = userEvent.setup();
    await screen.findByTestId('cita-c0');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(requests).toHaveBeenLastCalledWith({ limit: '50', offset: '50' }));
    await screen.findByTestId('cita-c0');
    await chooseOption(user, screen.getByLabelText('Estado'), 'PENDIENTE');

    await waitFor(() =>
      expect(requests).toHaveBeenLastCalledWith({
        estado: 'PENDIENTE',
        limit: '50',
        offset: '0',
      }),
    );
  });

  it('no permite avanzar si la página no está llena', async () => {
    renderPage();

    await screen.findByTestId('cita-c1');

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('avisa si no hay citas', async () => {
    renderPage([]);

    expect(await screen.findByText('No hay citas con estos filtros')).toBeInTheDocument();
  });

  it('muestra el error si no se pueden cargar', async () => {
    renderPage(undefined, [
      http.get(`${API}/appointments`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    ]);

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent('Falló el servidor');
  });
});
