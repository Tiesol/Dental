import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testAppointment, testPublicDentist, testService } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { ReservaPage } from './ReservaPage';

const SLOTS = [
  { inicio: '2026-11-10T13:00:00.000Z', fin: '2026-11-10T13:30:00.000Z' },
  { inicio: '2026-11-10T13:15:00.000Z', fin: '2026-11-10T13:45:00.000Z' },
];

function renderPage(extras: RequestHandler[] = [], route = '/reservar') {
  const bookings: unknown[] = [];
  const slotRequests = vi.fn();
  const dentistRequests = vi.fn();
  server.use(
    http.get(`${API}/services`, () =>
      HttpResponse.json([
        testService({ id: 's1', nombre: 'Limpieza dental', duracionMin: 30 }),
        testService({ id: 's2', nombre: 'Ortodoncia', duracionMin: 60 }),
      ]),
    ),
    http.get(`${API}/services/s1`, () =>
      HttpResponse.json(testService({ id: 's1', nombre: 'Limpieza dental', duracionMin: 30 })),
    ),
    http.get(`${API}/dentists/d1`, () => HttpResponse.json(testPublicDentist())),
    http.get(`${API}/dentists`, ({ request }) => {
      dentistRequests(new URL(request.url).searchParams.get('serviceId'));
      return HttpResponse.json([testPublicDentist()]);
    }),
    http.get(`${API}/dentists/d1/slots`, ({ request }) => {
      const url = new URL(request.url);
      slotRequests(url.searchParams.get('serviceId'), url.searchParams.get('fecha'));
      return HttpResponse.json(SLOTS);
    }),
    http.post(`${API}/appointments`, async ({ request }) => {
      bookings.push(await request.json());
      return HttpResponse.json(testAppointment(), { status: 201 });
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
  return {
    bookings,
    slotRequests,
    dentistRequests,
  };
}

function steps() {
  const list = screen.getByRole('list', { name: 'Pasos de la reserva' });
  return within(list).getAllByRole('listitem');
}

async function upToDateStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Elegir Limpieza dental' }));
  await user.click(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' }));
  const date = await screen.findByLabelText('Fecha');
  await user.clear(date);
  await user.type(date, '10/11/2026');
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
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Reservar cita' })).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Elegir Ortodoncia' })).toBeInTheDocument();
  });

  it('muestra los pasos de la reserva y marca el actual a medida que avanza', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Limpieza dental' }));
    expect(steps().map((p) => p.textContent)).toEqual([
      'Servicio',
      'Odontólogo',
      'Horario',
      'Confirmar',
    ]);
    await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' });

    expect(steps()[1]).toHaveAttribute('aria-current', 'step');
    expect(steps()[0]).not.toHaveAttribute('aria-current');
  });

  it('desde un odontólogo, los pasos empiezan por él', async () => {
    renderPage([], '/reservar?odontologo=d1');

    await screen.findByRole('heading', { name: '2. Elige un servicio de Dra. Laura Gómez' });

    expect(steps().map((p) => p.textContent)).toEqual([
      'Odontólogo',
      'Servicio',
      'Horario',
      'Confirmar',
    ]);
    expect(steps()[1]).toHaveAttribute('aria-current', 'step');
  });

  it('desde un servicio del catálogo llega con ese servicio elegido y pide el odontólogo', async () => {
    const { dentistRequests } = renderPage([], '/reservar?servicio=s1');

    expect(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' })).toBeVisible();
    expect(screen.getByText('Limpieza dental')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Elegir Ortodoncia' })).not.toBeInTheDocument();
    expect(dentistRequests).toHaveBeenCalledWith('s1');
  });

  it('desde un odontólogo llega con él elegido, ofrece solo sus servicios y sigue a la fecha', async () => {
    const { dentistRequests, slotRequests } = renderPage([], '/reservar?odontologo=d1');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: '2. Elige un servicio de Dra. Laura Gómez' }),
    ).toBeVisible();
    const cleaning = await screen.findByRole('button', { name: 'Elegir Limpieza dental' });
    expect(screen.queryByRole('button', { name: 'Elegir Ortodoncia' })).not.toBeInTheDocument();
    await user.click(cleaning);
    const date = await screen.findByLabelText('Fecha');
    await user.clear(date);
    await user.type(date, '10/11/2026');

    expect(await screen.findByTestId('slot-09:00')).toBeInTheDocument();
    expect(slotRequests).toHaveBeenLastCalledWith('s1', '2026-11-10');
    expect(dentistRequests).not.toHaveBeenCalled();
  });

  it.each([
    ['/reservar', 'Mis citas', '/mis-citas'],
    ['/reservar?servicio=s1', 'Servicios', '/servicios'],
    ['/reservar?odontologo=d1', 'Odontólogos', '/odontologos'],
  ])('desde %s, el enlace de volver lleva a %s', async (route, name, target) => {
    renderPage([], route);

    expect(await screen.findByRole('link', { name })).toHaveAttribute('href', target);
  });

  it('si el servicio del enlace ya no está disponible, lo avisa y muestra el catálogo', async () => {
    renderPage(
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
    const { dentistRequests } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Ortodoncia' }));

    expect(await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' })).toBeVisible();
    expect(dentistRequests).toHaveBeenCalledWith('s2');
  });

  it('avisa si ningún odontólogo realiza el servicio', async () => {
    renderPage([http.get(`${API}/dentists`, () => HttpResponse.json([]))]);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Ortodoncia' }));

    expect(await screen.findByText('No hay odontólogos para este servicio')).toBeInTheDocument();
  });

  it('muestra los horarios de la fecha elegida en hora de la clínica', async () => {
    const { slotRequests } = renderPage();
    const user = userEvent.setup();

    await upToDateStep(user);

    const tomorrow = await screen.findByRole('list', { name: 'Mañana' });
    expect(within(tomorrow).getByRole('button', { name: '09:00 a 09:30' })).toHaveTextContent(
      /^09:00$/,
    );
    expect(within(tomorrow).getByRole('button', { name: '09:15 a 09:45' })).toHaveTextContent(
      /^09:15$/,
    );
    expect(screen.getByText('Cada cita dura 30 min. Elige a qué hora empezar.')).toBeVisible();
    expect(slotRequests).toHaveBeenLastCalledWith('s1', '2026-11-10');
  });

  it('separa los horarios de la mañana y de la tarde', async () => {
    renderPage([
      http.get(`${API}/dentists/d1/slots`, () =>
        HttpResponse.json([
          { inicio: '2026-11-10T13:00:00.000Z', fin: '2026-11-10T13:30:00.000Z' },
          { inicio: '2026-11-10T19:00:00.000Z', fin: '2026-11-10T19:30:00.000Z' },
        ]),
      ),
    ]);
    const user = userEvent.setup();

    await upToDateStep(user);

    const tomorrow = await screen.findByRole('list', { name: 'Mañana' });
    const afternoon = screen.getByRole('list', { name: 'Tarde' });
    expect(
      within(tomorrow)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['09:00']);
    expect(
      within(afternoon)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['15:00']);
  });

  it('avisa si no hay horarios para la fecha', async () => {
    renderPage([http.get(`${API}/dentists/d1/slots`, () => HttpResponse.json([]))]);
    const user = userEvent.setup();

    await upToDateStep(user);

    expect(
      await screen.findByText('No hay horarios disponibles para esta fecha'),
    ).toBeInTheDocument();
  });

  it('muestra el resumen antes de confirmar', async () => {
    renderPage();
    const user = userEvent.setup();

    await upToDateStep(user);
    await user.click(await screen.findByTestId('slot-09:15'));

    const summary = await screen.findByTestId('resumen-reserva');
    expect(summary).toHaveTextContent('Limpieza dental');
    expect(summary).toHaveTextContent('Dra. Laura Gómez');
    expect(summary).toHaveTextContent('martes, 10 de noviembre de 2026');
    expect(summary).toHaveTextContent('09:15 - 09:45');
    expect(steps()[3]).toHaveAttribute('aria-current', 'step');
  });

  it('al confirmar envía el inicio tal como lo devolvió el backend y va a Mis citas', async () => {
    const { bookings } = renderPage();
    const user = userEvent.setup();

    await upToDateStep(user);
    await user.click(await screen.findByTestId('slot-09:00'));
    await user.click(await screen.findByTestId('btn-reservar'));

    expect(await screen.findByRole('heading', { name: 'Mis citas de prueba' })).toBeVisible();
    expect(bookings).toEqual([
      { dentistId: 'd1', serviceId: 's1', horaInicio: '2026-11-10T13:00:00.000Z' },
    ]);
  });

  it('ante un 409 avisa, recarga los horarios y vuelve a la elección de horario', async () => {
    const { slotRequests } = renderPage();
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

    await upToDateStep(user);
    await user.click(await screen.findByTestId('slot-09:00'));
    const requestsBefore = slotRequests.mock.calls.length;
    await user.click(await screen.findByTestId('btn-reservar'));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'El horario ya no está disponible',
    );
    await waitFor(() => expect(slotRequests.mock.calls.length).toBeGreaterThan(requestsBefore));
    expect(await screen.findByTestId('slot-09:00')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-reservar')).not.toBeInTheDocument();
  });

  it('el botón de confirmar se deshabilita mientras se envía', async () => {
    renderPage();
    let release: () => void = () => undefined;
    server.use(
      http.post(`${API}/appointments`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(testAppointment(), { status: 201 });
      }),
    );
    const user = userEvent.setup();

    await upToDateStep(user);
    await user.click(await screen.findByTestId('slot-09:00'));
    await user.click(await screen.findByTestId('btn-reservar'));

    expect(screen.getByTestId('btn-reservar')).toBeDisabled();
    release();
    expect(await screen.findByRole('heading', { name: 'Mis citas de prueba' })).toBeVisible();
  });

  it('permite volver y elegir otro servicio', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Elegir Limpieza dental' }));
    await screen.findByRole('button', { name: 'Elegir Dra. Laura Gómez' });
    await user.click(screen.getByRole('button', { name: 'Cambiar servicio' }));

    expect(await screen.findByRole('button', { name: 'Elegir Ortodoncia' })).toBeVisible();
  });

  it('muestra el error si no se puede cargar el catálogo', async () => {
    renderPage([
      http.get(`${API}/services`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falló el servidor' }, { status: 500 }),
      ),
    ]);

    const error = await screen.findByTestId('error-mensaje');

    expect(within(error).getByText('Falló el servidor')).toBeInTheDocument();
  });
});
