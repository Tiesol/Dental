import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AppointmentResponse } from '@/api/types';
import { testAppointment } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { DetalleCitaPage } from './DetalleCitaPage';

const SLOTS = [{ inicio: '2026-11-10T14:00:00.000Z', fin: '2026-11-10T14:30:00.000Z' }];

function renderPage(initial: Partial<AppointmentResponse> = {}, extras: RequestHandler[] = []) {
  let appointment = testAppointment(initial);
  const reschedules: unknown[] = [];
  const cancellations = vi.fn();
  const slotRequests = vi.fn();
  server.use(
    http.get(`${API}/appointments/c1`, () => HttpResponse.json(appointment)),
    http.get(`${API}/dentists/d1/slots`, ({ request }) => {
      const url = new URL(request.url);
      slotRequests(url.searchParams.get('serviceId'), url.searchParams.get('fecha'));
      return HttpResponse.json(SLOTS);
    }),
    http.patch(`${API}/appointments/c1/cancel`, () => {
      cancellations();
      appointment = { ...appointment, estado: 'CANCELADA' };
      return HttpResponse.json(appointment);
    }),
    http.patch(`${API}/appointments/c1/reschedule`, async ({ request }) => {
      const body = (await request.json()) as { horaInicio: string };
      reschedules.push(body);
      appointment = {
        ...appointment,
        horaInicio: body.horaInicio,
        horaFin: '2026-11-10T14:30:00.000Z',
      };
      return HttpResponse.json(appointment);
    }),
  );
  server.use(...extras);
  renderWithProviders(
    <Routes>
      <Route path="/mis-citas/:id" element={<DetalleCitaPage />} />
    </Routes>,
    { route: '/mis-citas/c1', withSession: true },
  );
  return {
    reschedules,
    cancellations,
    slotRequests,
  };
}

const error409 = {
  statusCode: 409,
  error: 'HORARIO_NO_DISPONIBLE',
  message: 'El horario ya no está disponible',
};

describe('DetalleCitaPage', () => {
  // La cita cambió por otro lado: la acción responde 409 y la siguiente consulta trae el estado real.
  function withChangedAppointment(method: 'cancel' | 'reschedule') {
    let changed = false;
    return [
      http.patch(`${API}/appointments/c1/${method}`, () => {
        changed = true;
        return HttpResponse.json(
          { statusCode: 409, error: 'CITA_NO_MODIFICABLE', message: 'Ya no se puede modificar' },
          { status: 409 },
        );
      }),
      http.get(`${API}/appointments/c1`, () =>
        HttpResponse.json(testAppointment({ estado: changed ? 'CANCELADA' : 'PENDIENTE' })),
      ),
    ];
  }

  it('si no se pudo cancelar, avisa y muestra el estado real de la cita', async () => {
    renderPage({}, withChangedAppointment('cancel'));
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar cita' }),
    );

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(screen.getByTestId('error-mensaje')).toHaveTextContent('Ya no se puede modificar');
    expect(screen.queryByTestId('btn-cancelar')).not.toBeInTheDocument();
  });

  it('si no se pudo reprogramar porque la cita cambió, cierra el panel y muestra su estado real', async () => {
    renderPage({}, withChangedAppointment('reschedule'));
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-reprogramar'));
    await user.click(await screen.findByTestId('slot-10:00'));
    await user.click(await screen.findByTestId('btn-confirmar-reprogramacion'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(screen.getByTestId('error-mensaje')).toHaveTextContent('Ya no se puede modificar');
    expect(screen.queryByTestId('slot-10:00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-confirmar-reprogramacion')).not.toBeInTheDocument();
  });

  it('confirma con un mensaje que la cita se canceló', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar cita' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Cita cancelada');
  });

  it('confirma con un mensaje que la cita se reprogramó', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-reprogramar'));
    await user.click(await screen.findByTestId('slot-10:00'));
    await user.click(await screen.findByTestId('btn-confirmar-reprogramacion'));

    await waitFor(() =>
      expect(screen.getByTestId('datos-cita')).toHaveTextContent('10:00 - 10:30'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cita reprogramada');
  });

  it('muestra servicio, odontólogo, fecha, horario y estado', async () => {
    renderPage();

    expect(await screen.findByTestId('estado-cita')).toHaveTextContent('PENDIENTE');
    const data = screen.getByTestId('datos-cita');
    expect(data).toHaveTextContent('Limpieza dental');
    expect(data).toHaveTextContent('Dra. Laura Gómez');
    expect(data).toHaveTextContent('martes, 10 de noviembre de 2026');
    expect(data).toHaveTextContent('09:00 - 09:30');
  });

  it('una cita finalizada muestra su observación', async () => {
    renderPage({
      estado: 'FINALIZADA',
      observacion: { texto: 'Sin novedades', createdAt: '2026-11-10T14:00:00.000Z' },
    });

    expect(await screen.findByText('Sin novedades')).toBeInTheDocument();
  });

  it.each(['PENDIENTE', 'CONFIRMADA'] as const)(
    'una cita %s ofrece reprogramar y cancelar',
    async (status) => {
      renderPage({ estado: status });

      expect(await screen.findByTestId('btn-reprogramar')).toBeInTheDocument();
      expect(await screen.findByTestId('btn-cancelar')).toBeInTheDocument();
    },
  );

  it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
    'una cita %s no ofrece reprogramar ni cancelar',
    async (status) => {
      renderPage({ estado: status });

      await screen.findByTestId('estado-cita');
      await screen.findByRole('heading', { level: 1 });

      expect(screen.queryByTestId('btn-reprogramar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-cancelar')).not.toBeInTheDocument();
    },
  );

  it('una cita ajena muestra que no hay acceso y ningún dato', async () => {
    renderPage(undefined, [
      http.get(`${API}/appointments/c1`, () =>
        HttpResponse.json(
          {
            statusCode: 403,
            error: 'ACCESO_DENEGADO_A_CITA',
            message: 'No tienes acceso a esta cita',
          },
          { status: 403 },
        ),
      ),
    ]);

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'No tienes acceso a esta cita',
    );
    expect(screen.queryByTestId('datos-cita')).not.toBeInTheDocument();
    expect(screen.queryByTestId('estado-cita')).not.toBeInTheDocument();
  });

  it('cancela al confirmar y muestra el estado CANCELADA', async () => {
    const { cancellations } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar cita' }),
    );

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(cancellations).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('btn-cancelar')).not.toBeInTheDocument();
  });

  it('no cancela si se desiste en la confirmación', async () => {
    const { cancellations } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver' }));

    expect(cancellations).not.toHaveBeenCalled();
    expect(screen.getByTestId('estado-cita')).toHaveTextContent('PENDIENTE');
  });

  it('muestra el mensaje del backend si no se puede cancelar', async () => {
    renderPage();
    server.use(
      http.patch(`${API}/appointments/c1/cancel`, () =>
        HttpResponse.json(
          { statusCode: 409, error: 'CITA_NO_MODIFICABLE', message: 'Ya no se puede cancelar' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar cita' }),
    );

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent('Ya no se puede cancelar');
  });

  it('reprogramar consulta los horarios del mismo odontólogo y servicio, desde el día de la cita', async () => {
    const { slotRequests } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-reprogramar'));

    expect(await screen.findByTestId('slot-10:00')).toHaveAccessibleName('10:00 a 10:30');
    expect(slotRequests).toHaveBeenCalledWith('s1', '2026-11-10');
  });

  it('reprograma al horario elegido y muestra el nuevo', async () => {
    const { reschedules } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-reprogramar'));
    await user.click(await screen.findByTestId('slot-10:00'));
    await user.click(await screen.findByTestId('btn-confirmar-reprogramacion'));

    await waitFor(() =>
      expect(screen.getByTestId('datos-cita')).toHaveTextContent('10:00 - 10:30'),
    );
    expect(reschedules).toEqual([{ horaInicio: '2026-11-10T14:00:00.000Z' }]);
    expect(screen.queryByTestId('btn-confirmar-reprogramacion')).not.toBeInTheDocument();
  });

  it('ante un 409 al reprogramar conserva el horario, avisa y recarga los horarios', async () => {
    const { slotRequests } = renderPage();
    server.use(
      http.patch(`${API}/appointments/c1/reschedule`, () =>
        HttpResponse.json(error409, { status: 409 }),
      ),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-reprogramar'));
    await user.click(await screen.findByTestId('slot-10:00'));
    const requestsBefore = slotRequests.mock.calls.length;
    await user.click(await screen.findByTestId('btn-confirmar-reprogramacion'));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'El horario ya no está disponible',
    );
    expect(screen.getByTestId('datos-cita')).toHaveTextContent('09:00 - 09:30');
    await waitFor(() => expect(slotRequests.mock.calls.length).toBeGreaterThan(requestsBefore));
  });

  it('permite desistir de reprogramar', async () => {
    const { reschedules } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-reprogramar'));
    await screen.findByTestId('slot-10:00');
    await user.click(screen.getByRole('button', { name: 'Volver a la cita' }));

    expect(screen.queryByTestId('slot-10:00')).not.toBeInTheDocument();
    expect(reschedules).toEqual([]);
  });
});
