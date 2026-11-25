import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppointmentResponse, AppointmentStatus } from '@/api/types';
import { testAppointment, testUser } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { DetalleAtencionPage } from './DetalleAtencionPage';

function renderPage(initial: Partial<AppointmentResponse>, extras: RequestHandler[] = []) {
  let appointment = testAppointment(initial);
  const changes: unknown[] = [];
  const observations: unknown[] = [];
  server.use(
    http.get(`${API}/appointments/c1`, () => HttpResponse.json(appointment)),
    http.patch(`${API}/appointments/c1/status`, async ({ request }) => {
      const body = (await request.json()) as { estado: AppointmentStatus };
      changes.push(body);
      appointment = { ...appointment, estado: body.estado };
      return HttpResponse.json(appointment);
    }),
    http.post(`${API}/appointments/c1/observation`, async ({ request }) => {
      const body = (await request.json()) as { texto: string };
      observations.push(body);
      const observation = { texto: body.texto, createdAt: '2026-11-09T14:00:00.000Z' };
      appointment = { ...appointment, observacion: observation };
      return HttpResponse.json(observation, { status: 201 });
    }),
  );
  server.use(...extras);
  renderWithProviders(
    <Routes>
      <Route path="/agenda/:id" element={<DetalleAtencionPage />} />
    </Routes>,
    { route: '/agenda/c1', withSession: true },
  );
  return { changes, observations };
}

describe('DetalleAtencionPage', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(testUser({ role: 'ODONTOLOGO', dentistId: 'd1' })),
      ),
    );
  });

  it('si el cambio de estado falla, avisa y muestra el estado real de la cita', async () => {
    let changed = false;
    renderPage({ estado: 'CONFIRMADA' }, [
      http.patch(`${API}/appointments/c1/status`, () => {
        changed = true;
        return HttpResponse.json(
          { statusCode: 409, error: 'TRANSICION_DE_ESTADO_INVALIDA', message: 'No se puede' },
          { status: 409 },
        );
      }),
      http.get(`${API}/appointments/c1`, () =>
        HttpResponse.json(testAppointment({ estado: changed ? 'CANCELADA' : 'CONFIRMADA' })),
      ),
    ]);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-iniciar-atencion'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(screen.getByTestId('error-mensaje')).toHaveTextContent('No se puede');
    expect(screen.queryByTestId('btn-iniciar-atencion')).not.toBeInTheDocument();
  });

  it('al guardar la observación, solo ese botón queda cargando', async () => {
    let release: () => void = () => undefined;
    renderPage({ estado: 'EN_ATENCION' }, [
      http.post(`${API}/appointments/c1/observation`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { texto: 'Bien', createdAt: '2026-11-09T14:00:00.000Z' },
          { status: 201 },
        );
      }),
    ]);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Observación'), 'Bien');
    await user.click(screen.getByTestId('btn-registrar-observacion'));

    expect(screen.getByTestId('btn-registrar-observacion')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('btn-finalizar')).not.toHaveAttribute('aria-busy');
    release();
    await waitFor(() => expect(screen.getByTestId('observacion-cita')).toHaveTextContent('Bien'));
  });

  it('muestra los datos del paciente y de la cita', async () => {
    renderPage({ estado: 'CONFIRMADA' });

    const data = await screen.findByTestId('datos-cita');

    expect(data).toHaveTextContent('Ana Pérez');
    expect(data).toHaveTextContent('Limpieza dental');
  });

  it('una cita PENDIENTE solo ofrece confirmarla', async () => {
    renderPage({ estado: 'PENDIENTE' });

    expect(await screen.findByTestId('btn-confirmar-cita')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-iniciar-atencion')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-finalizar')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Observación')).not.toBeInTheDocument();
  });

  it('confirma una cita PENDIENTE y luego ofrece iniciar la atención', async () => {
    const { changes } = renderPage({ estado: 'PENDIENTE' });
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-confirmar-cita'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CONFIRMADA'));
    expect(changes).toEqual([{ estado: 'CONFIRMADA' }]);
    expect(screen.getByText('Cita confirmada')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-confirmar-cita')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-iniciar-atencion')).toBeInTheDocument();
  });

  it('inicia la atención de una cita CONFIRMADA', async () => {
    const { changes } = renderPage({ estado: 'CONFIRMADA' });
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-iniciar-atencion'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('EN ATENCIÓN'));
    expect(changes).toEqual([{ estado: 'EN_ATENCION' }]);
  });

  it('en atención, sin observación, Finalizar está deshabilitado', async () => {
    renderPage({ estado: 'EN_ATENCION' });

    expect(await screen.findByTestId('btn-finalizar')).toBeDisabled();
  });

  it('registra la observación y habilita Finalizar', async () => {
    const { observations } = renderPage({ estado: 'EN_ATENCION' });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Observación'), 'Limpieza sin complicaciones');
    await user.click(screen.getByTestId('btn-registrar-observacion'));

    await waitFor(() =>
      expect(screen.getByTestId('observacion-cita')).toHaveTextContent(
        'Limpieza sin complicaciones',
      ),
    );
    expect(observations).toEqual([{ texto: 'Limpieza sin complicaciones' }]);
    expect(screen.getByTestId('btn-finalizar')).toBeEnabled();
    expect(screen.queryByLabelText('Observación')).not.toBeInTheDocument();
  });

  it('finaliza la cita con observación y queda de solo lectura', async () => {
    const { changes } = renderPage({
      estado: 'EN_ATENCION',
      observacion: { texto: 'Sin novedades', createdAt: '2026-11-09T14:00:00.000Z' },
    });
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-finalizar'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('FINALIZADA'));
    expect(changes).toEqual([{ estado: 'FINALIZADA' }]);
    expect(screen.queryByTestId('btn-finalizar')).not.toBeInTheDocument();
    expect(screen.getByTestId('observacion-cita')).toHaveTextContent('Sin novedades');
  });

  it('muestra el mensaje del backend si el cambio de estado falla', async () => {
    renderPage({ estado: 'CONFIRMADA' });
    server.use(
      http.patch(`${API}/appointments/c1/status`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'TRANSICION_DE_ESTADO_INVALIDA',
            message: 'Una cita CANCELADA no puede pasar a EN_ATENCION',
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-iniciar-atencion'));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Una cita CANCELADA no puede pasar a EN_ATENCION',
    );
  });

  it('muestra el mensaje del backend si la observación falla', async () => {
    renderPage({ estado: 'EN_ATENCION' });
    server.use(
      http.post(`${API}/appointments/c1/observation`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'OBSERVACION_YA_REGISTRADA',
            message: 'Esta cita ya tiene una observación registrada',
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Observación'), 'Otra');
    await user.click(screen.getByTestId('btn-registrar-observacion'));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Esta cita ya tiene una observación registrada',
    );
  });

  it('muestra que no hay acceso si la cita es de otro odontólogo', async () => {
    renderPage({}, [
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
  });
});
