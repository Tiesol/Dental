import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppointmentResponse, EstadoCita } from '@/api/types';
import { citaDePrueba, usuarioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { DetalleAtencionPage } from './DetalleAtencionPage';

function renderPagina(inicial: Partial<AppointmentResponse>) {
  let cita = citaDePrueba(inicial);
  const cambios: unknown[] = [];
  const observaciones: unknown[] = [];
  server.use(
    http.get(`${API}/appointments/c1`, () => HttpResponse.json(cita)),
    http.patch(`${API}/appointments/c1/status`, async ({ request }) => {
      const cuerpo = (await request.json()) as { estado: EstadoCita };
      cambios.push(cuerpo);
      cita = { ...cita, estado: cuerpo.estado };
      return HttpResponse.json(cita);
    }),
    http.post(`${API}/appointments/c1/observation`, async ({ request }) => {
      const cuerpo = (await request.json()) as { texto: string };
      observaciones.push(cuerpo);
      const observacion = { texto: cuerpo.texto, createdAt: '2026-11-09T14:00:00.000Z' };
      cita = { ...cita, observacion };
      return HttpResponse.json(observacion, { status: 201 });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/agenda/:id" element={<DetalleAtencionPage />} />
    </Routes>,
    { route: '/agenda/c1', conSesion: true },
  );
  return { cambios, observaciones };
}

describe('DetalleAtencionPage', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(usuarioDePrueba({ role: 'ODONTOLOGO', dentistId: 'd1' })),
      ),
    );
  });

  it('muestra los datos del paciente y de la cita', async () => {
    renderPagina({ estado: 'CONFIRMADA' });

    const datos = await screen.findByTestId('datos-cita');

    expect(datos).toHaveTextContent('Ana Pérez');
    expect(datos).toHaveTextContent('Limpieza dental');
  });

  it('una cita PENDIENTE es de solo lectura', async () => {
    renderPagina({ estado: 'PENDIENTE' });

    await screen.findByTestId('datos-cita');

    expect(screen.queryByTestId('btn-iniciar-atencion')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-finalizar')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Observación')).not.toBeInTheDocument();
  });

  it('inicia la atención de una cita CONFIRMADA', async () => {
    const { cambios } = renderPagina({ estado: 'CONFIRMADA' });
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-iniciar-atencion'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('EN ATENCIÓN'));
    expect(cambios).toEqual([{ estado: 'EN_ATENCION' }]);
  });

  it('en atención, sin observación, Finalizar está deshabilitado', async () => {
    renderPagina({ estado: 'EN_ATENCION' });

    expect(await screen.findByTestId('btn-finalizar')).toBeDisabled();
  });

  it('registra la observación y habilita Finalizar', async () => {
    const { observaciones } = renderPagina({ estado: 'EN_ATENCION' });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Observación'), 'Limpieza sin complicaciones');
    await user.click(screen.getByTestId('btn-registrar-observacion'));

    await waitFor(() =>
      expect(screen.getByTestId('observacion-cita')).toHaveTextContent(
        'Limpieza sin complicaciones',
      ),
    );
    expect(observaciones).toEqual([{ texto: 'Limpieza sin complicaciones' }]);
    expect(screen.getByTestId('btn-finalizar')).toBeEnabled();
    expect(screen.queryByLabelText('Observación')).not.toBeInTheDocument();
  });

  it('finaliza la cita con observación y queda de solo lectura', async () => {
    const { cambios } = renderPagina({
      estado: 'EN_ATENCION',
      observacion: { texto: 'Sin novedades', createdAt: '2026-11-09T14:00:00.000Z' },
    });
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-finalizar'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('FINALIZADA'));
    expect(cambios).toEqual([{ estado: 'FINALIZADA' }]);
    expect(screen.queryByTestId('btn-finalizar')).not.toBeInTheDocument();
    expect(screen.getByTestId('observacion-cita')).toHaveTextContent('Sin novedades');
  });

  it('muestra el mensaje del backend si el cambio de estado falla', async () => {
    renderPagina({ estado: 'CONFIRMADA' });
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
    renderPagina({ estado: 'EN_ATENCION' });
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
    renderPagina({});
    server.use(
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
    );

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'No tienes acceso a esta cita',
    );
    expect(screen.queryByTestId('datos-cita')).not.toBeInTheDocument();
  });
});
