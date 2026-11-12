import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { AppointmentResponse } from '@/api/types';
import { citaDePrueba, odontologoAdminDePrueba, usuarioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { elegirOpcion, renderWithProviders } from '@/test/utils';
import { AdminCitasPage } from './AdminCitasPage';

function renderPagina(
  iniciales: AppointmentResponse[] = [citaDePrueba()],
  extras: RequestHandler[] = [],
) {
  let citas = iniciales;
  const consultas = vi.fn();
  const cambios: unknown[] = [];
  const cancelaciones: string[] = [];
  const actualizar = (id: string, estado: AppointmentResponse['estado']) => {
    citas = citas.map((c) => (c.id === id ? { ...c, estado } : c));
    return citas.find((c) => c.id === id);
  };
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json(usuarioDePrueba({ role: 'ADMIN', patientId: undefined })),
    ),
    http.get(`${API}/dentists`, () => HttpResponse.json([odontologoAdminDePrueba()])),
    http.get(`${API}/appointments`, ({ request }) => {
      consultas(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json(citas);
    }),
    http.patch(`${API}/appointments/:id/status`, async ({ request, params }) => {
      const cuerpo = (await request.json()) as { estado: AppointmentResponse['estado'] };
      cambios.push({ id: params.id, ...cuerpo });
      return HttpResponse.json(actualizar(params.id as string, cuerpo.estado));
    }),
    http.patch(`${API}/appointments/:id/cancel`, ({ params }) => {
      cancelaciones.push(params.id as string);
      return HttpResponse.json(actualizar(params.id as string, 'CANCELADA'));
    }),
  );
  server.use(...extras);
  renderWithProviders(<AdminCitasPage />, { route: '/admin/citas', conSesion: true });
  return { consultas, cambios, cancelaciones };
}

describe('AdminCitasPage', () => {
  it('lista las citas con paciente, odontólogo, servicio, horario y estado', async () => {
    renderPagina();

    const fila = await screen.findByTestId('cita-c1');

    expect(fila).toHaveTextContent('Ana Pérez');
    expect(fila).toHaveTextContent('Dra. Laura Gómez');
    expect(fila).toHaveTextContent('Limpieza dental');
    expect(fila).toHaveTextContent('09:00 - 09:30');
    expect(fila).toHaveTextContent('PENDIENTE');
  });

  it('consulta las citas con el límite de una página', async () => {
    const { consultas } = renderPagina();

    await screen.findByTestId('cita-c1');

    expect(consultas).toHaveBeenLastCalledWith({ limit: '50', offset: '0' });
  });

  it('una cita PENDIENTE ofrece confirmar y cancelar', async () => {
    renderPagina();

    const fila = await screen.findByTestId('cita-c1');

    expect(await within(fila).findByTestId('btn-confirmar')).toBeInTheDocument();
    expect(within(fila).getByTestId('btn-cancelar')).toBeInTheDocument();
  });

  it('una cita CONFIRMADA solo ofrece cancelar', async () => {
    renderPagina([citaDePrueba({ estado: 'CONFIRMADA' })]);

    const fila = await screen.findByTestId('cita-c1');

    expect(await within(fila).findByTestId('btn-cancelar')).toBeInTheDocument();
    expect(within(fila).queryByTestId('btn-confirmar')).not.toBeInTheDocument();
  });

  it.each(['EN_ATENCION', 'FINALIZADA', 'CANCELADA'] as const)(
    'una cita %s no ofrece acciones',
    async (estado) => {
      renderPagina([citaDePrueba({ estado })]);

      const fila = await screen.findByTestId('cita-c1');
      await screen.findByRole('heading', { level: 1 });

      expect(within(fila).queryByTestId('btn-confirmar')).not.toBeInTheDocument();
      expect(within(fila).queryByTestId('btn-cancelar')).not.toBeInTheDocument();
    },
  );

  it('confirma una cita y actualiza su estado', async () => {
    const { cambios } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-confirmar'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CONFIRMADA'));
    expect(cambios).toEqual([{ id: 'c1', estado: 'CONFIRMADA' }]);
  });

  it('cancela una cita tras confirmar en el diálogo', async () => {
    const { cancelaciones } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar cita' }),
    );

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(cancelaciones).toEqual(['c1']);
  });

  it('no cancela si se desiste en el diálogo', async () => {
    const { cancelaciones } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-cancelar'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver' }));

    expect(cancelaciones).toEqual([]);
  });

  it('muestra el mensaje del backend si una acción falla', async () => {
    renderPagina();
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
    let cambiada = false;
    renderPagina(undefined, [
      http.patch(`${API}/appointments/:id/status`, () => {
        cambiada = true;
        return HttpResponse.json(
          { statusCode: 409, error: 'TRANSICION_DE_ESTADO_INVALIDA', message: 'No se puede' },
          { status: 409 },
        );
      }),
      http.get(`${API}/appointments`, () =>
        HttpResponse.json([citaDePrueba({ estado: cambiada ? 'CANCELADA' : 'PENDIENTE' })]),
      ),
    ]);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('btn-confirmar'));

    await waitFor(() => expect(screen.getByTestId('estado-cita')).toHaveTextContent('CANCELADA'));
    expect(screen.getByTestId('error-mensaje')).toHaveTextContent('No se puede');
  });

  it('filtra por fecha, estado y odontólogo', async () => {
    const { consultas } = renderPagina();
    const user = userEvent.setup();
    await screen.findByTestId('cita-c1');

    await user.type(screen.getByLabelText('Fecha'), '10/11/2026');
    await elegirOpcion(user, screen.getByLabelText('Estado'), 'CONFIRMADA');
    await elegirOpcion(user, await screen.findByLabelText('Odontólogo'), 'Dra. Laura Gómez');

    await waitFor(() =>
      expect(consultas).toHaveBeenLastCalledWith({
        fecha: '2026-11-10',
        estado: 'CONFIRMADA',
        dentistId: 'd1',
        limit: '50',
        offset: '0',
      }),
    );
  });

  it('avanza de página cuando la actual está llena y vuelve a la primera al filtrar', async () => {
    const llena = Array.from({ length: 50 }, (_, i) => citaDePrueba({ id: `c${i}` }));
    const { consultas } = renderPagina(llena);
    const user = userEvent.setup();
    await screen.findByTestId('cita-c0');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(consultas).toHaveBeenLastCalledWith({ limit: '50', offset: '50' }));
    await screen.findByTestId('cita-c0');
    await elegirOpcion(user, screen.getByLabelText('Estado'), 'PENDIENTE');

    await waitFor(() =>
      expect(consultas).toHaveBeenLastCalledWith({
        estado: 'PENDIENTE',
        limit: '50',
        offset: '0',
      }),
    );
  });

  it('no permite avanzar si la página no está llena', async () => {
    renderPagina();

    await screen.findByTestId('cita-c1');

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('avisa si no hay citas', async () => {
    renderPagina([]);

    expect(await screen.findByText('No hay citas con estos filtros')).toBeInTheDocument();
  });

  it('muestra el error si no se pueden cargar', async () => {
    renderPagina(undefined, [
      http.get(`${API}/appointments`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    ]);

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent('Falló el servidor');
  });
});
