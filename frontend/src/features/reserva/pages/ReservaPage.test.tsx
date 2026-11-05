import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { citaDePrueba, odontologoPublicoDePrueba, servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { ReservaPage } from './ReservaPage';

const SLOTS = [
  { inicio: '2026-11-10T13:00:00.000Z', fin: '2026-11-10T13:30:00.000Z' },
  { inicio: '2026-11-10T13:15:00.000Z', fin: '2026-11-10T13:45:00.000Z' },
];

function renderPagina() {
  const reservas: unknown[] = [];
  const consultasDeSlots = vi.fn();
  const consultasDeOdontologos = vi.fn();
  server.use(
    http.get(`${API}/services`, () =>
      HttpResponse.json([
        servicioDePrueba({ id: 's1', nombre: 'Limpieza dental', duracionMin: 30 }),
        servicioDePrueba({ id: 's2', nombre: 'Ortodoncia', duracionMin: 60 }),
      ]),
    ),
    http.get(`${API}/dentists`, ({ request }) => {
      consultasDeOdontologos(new URL(request.url).searchParams.get('serviceId'));
      return HttpResponse.json([odontologoPublicoDePrueba()]);
    }),
    http.get(`${API}/dentists/d1/slots`, ({ request }) => {
      const url = new URL(request.url);
      consultasDeSlots(url.searchParams.get('serviceId'), url.searchParams.get('fecha'));
      return HttpResponse.json(SLOTS);
    }),
    http.post(`${API}/appointments`, async ({ request }) => {
      reservas.push(await request.json());
      return HttpResponse.json(citaDePrueba(), { status: 201 });
    }),
  );
  renderWithProviders(
    <Routes>
      <Route path="/reservar" element={<ReservaPage />} />
      <Route path="/mis-citas" element={<h1>Mis citas de prueba</h1>} />
    </Routes>,
    { route: '/reservar' },
  );
  return { reservas, consultasDeSlots, consultasDeOdontologos };
}

async function hastaLaFecha(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Elegir Limpieza dental' }));
  await user.click(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' }));
  const fecha = await screen.findByLabelText('Fecha');
  await user.clear(fecha);
  await user.type(fecha, '2026-11-10');
}

describe('ReservaPage', () => {
  it('empieza mostrando el catálogo de servicios', async () => {
    renderPagina();

    expect(await screen.findByRole('heading', { level: 1, name: 'Reservar cita' })).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Elegir Ortodoncia' })).toBeInTheDocument();
  });

  it('pide solo los odontólogos que realizan el servicio elegido', async () => {
    const { consultasDeOdontologos } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Ortodoncia' }));

    expect(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' })).toBeVisible();
    expect(consultasDeOdontologos).toHaveBeenCalledWith('s2');
  });

  it('avisa si ningún odontólogo realiza el servicio', async () => {
    renderPagina();
    server.use(http.get(`${API}/dentists`, () => HttpResponse.json([])));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Ortodoncia' }));

    expect(await screen.findByText('No hay odontólogos para este servicio')).toBeInTheDocument();
  });

  it('muestra los horarios de la fecha elegida en hora de la clínica', async () => {
    const { consultasDeSlots } = renderPagina();
    const user = userEvent.setup();

    await hastaLaFecha(user);

    expect(await screen.findByTestId('slot-09:00')).toHaveTextContent('09:00 - 09:30');
    expect(screen.getByTestId('slot-09:15')).toHaveTextContent('09:15 - 09:45');
    expect(consultasDeSlots).toHaveBeenLastCalledWith('s1', '2026-11-10');
  });

  it('avisa si no hay horarios para la fecha', async () => {
    renderPagina();
    server.use(http.get(`${API}/dentists/d1/slots`, () => HttpResponse.json([])));
    const user = userEvent.setup();

    await hastaLaFecha(user);

    expect(
      await screen.findByText('No hay horarios disponibles para esta fecha'),
    ).toBeInTheDocument();
  });

  it('muestra el resumen antes de confirmar', async () => {
    renderPagina();
    const user = userEvent.setup();

    await hastaLaFecha(user);
    await user.click(await screen.findByTestId('slot-09:15'));

    const resumen = await screen.findByTestId('resumen-reserva');
    expect(resumen).toHaveTextContent('Limpieza dental');
    expect(resumen).toHaveTextContent('Dra. Laura Gómez');
    expect(resumen).toHaveTextContent('martes, 10 de noviembre de 2026');
    expect(resumen).toHaveTextContent('09:15 - 09:45');
  });

  it('al confirmar envía el inicio tal como lo devolvió el backend y va a Mis citas', async () => {
    const { reservas } = renderPagina();
    const user = userEvent.setup();

    await hastaLaFecha(user);
    await user.click(await screen.findByTestId('slot-09:00'));
    await user.click(await screen.findByTestId('btn-reservar'));

    expect(await screen.findByRole('heading', { name: 'Mis citas de prueba' })).toBeVisible();
    expect(reservas).toEqual([
      { dentistId: 'd1', serviceId: 's1', horaInicio: '2026-11-10T13:00:00.000Z' },
    ]);
  });

  it('ante un 409 avisa, recarga los horarios y vuelve a la elección de horario', async () => {
    const { consultasDeSlots } = renderPagina();
    server.use(
      http.post(`${API}/appointments`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'HORARIO_NO_DISPONIBLE',
            message: 'El horario ya no está disponible',
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    await hastaLaFecha(user);
    await user.click(await screen.findByTestId('slot-09:00'));
    const consultasAntes = consultasDeSlots.mock.calls.length;
    await user.click(await screen.findByTestId('btn-reservar'));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'El horario ya no está disponible',
    );
    await waitFor(() => expect(consultasDeSlots.mock.calls.length).toBeGreaterThan(consultasAntes));
    expect(await screen.findByTestId('slot-09:00')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-reservar')).not.toBeInTheDocument();
  });

  it('el botón de confirmar se deshabilita mientras se envía', async () => {
    renderPagina();
    let liberar: () => void = () => undefined;
    server.use(
      http.post(`${API}/appointments`, async () => {
        await new Promise<void>((resolve) => {
          liberar = resolve;
        });
        return HttpResponse.json(citaDePrueba(), { status: 201 });
      }),
    );
    const user = userEvent.setup();

    await hastaLaFecha(user);
    await user.click(await screen.findByTestId('slot-09:00'));
    await user.click(await screen.findByTestId('btn-reservar'));

    expect(screen.getByTestId('btn-reservar')).toBeDisabled();
    liberar();
    expect(await screen.findByRole('heading', { name: 'Mis citas de prueba' })).toBeVisible();
  });

  it('permite volver y elegir otro servicio', async () => {
    renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Limpieza dental' }));
    await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' });
    await user.click(screen.getByRole('button', { name: 'Cambiar servicio' }));

    expect(await screen.findByRole('button', { name: 'Elegir Ortodoncia' })).toBeVisible();
  });

  it('muestra el error si no se puede cargar el catálogo', async () => {
    renderPagina();
    server.use(
      http.get(`${API}/services`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    );

    const error = await screen.findByTestId('error-mensaje');

    expect(within(error).getByText('Falló el servidor')).toBeInTheDocument();
  });
});
