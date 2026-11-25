import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { citaDePrueba, odontologoPublicoDePrueba, servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { ReservaPage } from './ReservaPage';

const SLOTS = [
  { inicio: '2026-11-10T13:00:00.000Z', fin: '2026-11-10T13:30:00.000Z' },
  { inicio: '2026-11-10T13:15:00.000Z', fin: '2026-11-10T13:45:00.000Z' },
];

function renderPagina(extras: RequestHandler[] = [], route = '/reservar') {
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
    http.get(`${API}/services/s1`, () =>
      HttpResponse.json(servicioDePrueba({ id: 's1', nombre: 'Limpieza dental', duracionMin: 30 })),
    ),
    http.get(`${API}/dentists/d1`, () => HttpResponse.json(odontologoPublicoDePrueba())),
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
  server.use(...extras);
  renderWithProviders(
    <Routes>
      <Route path="/reservar" element={<ReservaPage />} />
      <Route path="/mis-citas" element={<h1>Mis citas de prueba</h1>} />
    </Routes>,
    { route },
  );
  return { reservas, consultasDeSlots, consultasDeOdontologos };
}

async function hastaLaFecha(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Elegir Limpieza dental' }));
  await user.click(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' }));
  const fecha = await screen.findByLabelText('Fecha');
  await user.clear(fecha);
  await user.type(fecha, '10/11/2026');
}

describe('ReservaPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T14:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('empieza mostrando el catálogo de servicios', async () => {
    renderPagina();

    expect(await screen.findByRole('heading', { level: 1, name: 'Reservar cita' })).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Elegir Ortodoncia' })).toBeInTheDocument();
  });

  it('desde un servicio del catálogo llega con ese servicio elegido y pide el odontólogo', async () => {
    const { consultasDeOdontologos } = renderPagina([], '/reservar?servicio=s1');

    expect(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' })).toBeVisible();
    expect(screen.getByText('Limpieza dental')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Elegir Ortodoncia' })).not.toBeInTheDocument();
    expect(consultasDeOdontologos).toHaveBeenCalledWith('s1');
  });

  it('desde un odontólogo llega con él elegido, ofrece solo sus servicios y sigue a la fecha', async () => {
    const { consultasDeOdontologos, consultasDeSlots } = renderPagina(
      [],
      '/reservar?odontologo=d1',
    );
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: '2. Elige un servicio de Dra. Laura Gómez' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Elegir Ortodoncia' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Elegir Limpieza dental' }));
    const fecha = await screen.findByLabelText('Fecha');
    await user.clear(fecha);
    await user.type(fecha, '10/11/2026');

    expect(await screen.findByTestId('slot-09:00')).toBeInTheDocument();
    expect(consultasDeSlots).toHaveBeenLastCalledWith('s1', '2026-11-10');
    expect(consultasDeOdontologos).not.toHaveBeenCalled();
  });

  it.each([
    ['/reservar', 'Mis citas', '/mis-citas'],
    ['/reservar?servicio=s1', 'Servicios', '/servicios'],
    ['/reservar?odontologo=d1', 'Odontólogos', '/odontologos'],
  ])('desde %s, el enlace de volver lleva a %s', async (route, nombre, destino) => {
    renderPagina([], route);

    expect(await screen.findByRole('link', { name: nombre })).toHaveAttribute('href', destino);
  });

  it('si el servicio del enlace ya no está disponible, lo avisa y muestra el catálogo', async () => {
    renderPagina(
      [
        http.get(`${API}/services/s9`, () =>
          HttpResponse.json(
            { statusCode: 404, error: 'RECURSO_NO_ENCONTRADO', message: 'Servicio no encontrado' },
            { status: 404 },
          ),
        ),
      ],
      '/reservar?servicio=s9',
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no encontrado');
    expect(await screen.findByRole('button', { name: 'Elegir Ortodoncia' })).toBeVisible();
  });

  it('pide solo los odontólogos que realizan el servicio elegido', async () => {
    const { consultasDeOdontologos } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Ortodoncia' }));

    expect(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' })).toBeVisible();
    expect(consultasDeOdontologos).toHaveBeenCalledWith('s2');
  });

  it('avisa si ningún odontólogo realiza el servicio', async () => {
    renderPagina([http.get(`${API}/dentists`, () => HttpResponse.json([]))]);
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
    renderPagina([http.get(`${API}/dentists/d1/slots`, () => HttpResponse.json([]))]);
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
    renderPagina([
      http.get(`${API}/services`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    ]);

    const error = await screen.findByTestId('error-mensaje');

    expect(within(error).getByText('Falló el servidor')).toBeInTheDocument();
  });
});
