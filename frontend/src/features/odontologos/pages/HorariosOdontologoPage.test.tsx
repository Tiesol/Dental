import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { Link, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { AvailabilityResponse } from '@/api/types';
import { testAdminDentist } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { chooseOption, renderWithProviders } from '@/test/utils';
import { HorariosOdontologoPage } from './HorariosOdontologoPage';

const WITH_DATA: AvailabilityResponse = {
  horarios: [{ id: 'h1', diaSemana: 1, minutoInicio: 540, minutoFin: 720 }],
  bloques: [
    {
      id: 'b1',
      inicio: '2026-11-12T14:00:00.000Z',
      fin: '2026-11-12T15:00:00.000Z',
      motivo: 'Congreso',
    },
  ],
};

function renderPage(availability: AvailabilityResponse = WITH_DATA, extras: RequestHandler[] = []) {
  const saved: unknown[] = [];
  const createdBlocks: unknown[] = [];
  const deletedBlocks: string[] = [];
  server.use(
    http.get(`${API}/dentists/d1`, () => HttpResponse.json(testAdminDentist())),
    http.get(`${API}/dentists/d1/availability`, () => HttpResponse.json(availability)),
    http.put(`${API}/dentists/d1/availability`, async ({ request }) => {
      const body = (await request.json()) as { horarios: { diaSemana: number }[] };
      saved.push(body);
      return HttpResponse.json({
        horarios: body.horarios.map((h, i) => ({ id: `n${i}`, ...h })),
        bloques: availability.bloques,
      });
    }),
    http.post(`${API}/dentists/d1/blocks`, async ({ request }) => {
      const body = (await request.json()) as { inicio: string; fin: string; motivo?: string };
      createdBlocks.push(body);
      return HttpResponse.json(
        { id: 'b2', motivo: null, ...body },
        {
          status: 201,
        },
      );
    }),
    http.delete(`${API}/dentists/d1/blocks/:blockId`, ({ params }) => {
      deletedBlocks.push(params.blockId as string);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  server.use(...extras);
  renderWithProviders(
    <Routes>
      <Route path="/admin/odontologos/:id/horarios" element={<HorariosOdontologoPage />} />
    </Routes>,
    { route: '/admin/odontologos/d1/horarios' },
  );
  return { saved, createdBlocks, deletedBlocks };
}

// Bloque del 13/11/2026 de 10:00 a 11:30, hora de la clínica.
async function fillBlock(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Fecha de inicio'), '13/11/2026');
  await user.type(screen.getByLabelText('Hora de inicio'), '10:00');
  await user.type(screen.getByLabelText('Fecha de fin'), '13/11/2026');
  await user.type(screen.getByLabelText('Hora de fin'), '11:30');
}

describe('HorariosOdontologoPage', () => {
  it('muestra el título con el nombre del odontólogo', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Horarios y bloques' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Dra. Laura Gómez')).toBeInTheDocument();
  });

  it('muestra los tramos actuales con su día y sus horas', async () => {
    renderPage();

    const timeRange = await screen.findByTestId('tramo-0');

    expect(within(timeRange).getByLabelText('Día')).toHaveTextContent('Lunes');
    expect(within(timeRange).getByLabelText('Desde')).toHaveValue('09:00');
    expect(within(timeRange).getByLabelText('Hasta')).toHaveValue('12:00');
  });

  it('cada tramo es un grupo con nombre, para distinguir sus campos', async () => {
    renderPage();

    expect(await screen.findByRole('group', { name: 'Tramo 1' })).toBe(
      screen.getByTestId('tramo-0'),
    );
  });

  it('no permite repetir el borrado de un bloque mientras se envía', async () => {
    let release: () => void = () => undefined;
    renderPage();
    server.use(
      http.delete(`${API}/dentists/d1/blocks/:blockId`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar bloque' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar bloque' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Quitar bloque' })).toBeDisabled(),
    );
    release();
    expect(await screen.findByText('No hay bloques no disponibles')).toBeInTheDocument();
  });

  it('avisa cuando el odontólogo no tiene horarios', async () => {
    renderPage({ horarios: [], bloques: [] });

    expect(await screen.findByText('Todavía no tiene horarios de atención')).toBeInTheDocument();
  });

  it('agrega un tramo y guarda todos los horarios en minutos', async () => {
    const { saved } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Agregar tramo' }));
    const newValue = screen.getByTestId('tramo-1');
    await chooseOption(user, within(newValue).getByLabelText('Día'), 'Martes');
    await user.clear(within(newValue).getByLabelText('Desde'));
    await user.type(within(newValue).getByLabelText('Desde'), '14:00');
    await user.clear(within(newValue).getByLabelText('Hasta'));
    await user.type(within(newValue).getByLabelText('Hasta'), '18:30');
    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Horarios guardados');
    expect(saved).toEqual([
      {
        horarios: [
          { diaSemana: 1, minutoInicio: 540, minutoFin: 720 },
          { diaSemana: 2, minutoInicio: 840, minutoFin: 1110 },
        ],
      },
    ]);
  });

  it('quita un tramo antes de guardar', async () => {
    const { saved } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar tramo 1' }));
    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Horarios guardados');
    expect(saved).toEqual([{ horarios: [] }]);
  });

  it('muestra el mensaje del backend si los horarios son inválidos', async () => {
    renderPage();
    server.use(
      http.put(`${API}/dentists/d1/availability`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            error: 'HORARIO_INVALIDO',
            message: 'Los horarios de un mismo día no pueden solaparse',
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Guardar horarios' }));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Los horarios de un mismo día no pueden solaparse',
    );
  });

  it('lista los bloques vigentes con su horario local y su motivo', async () => {
    renderPage();

    const block = await screen.findByTestId('bloque-b1');

    expect(block).toHaveTextContent('jueves, 12 de noviembre de 2026, 10:00');
    expect(block).toHaveTextContent('Congreso');
  });

  it('avisa cuando no hay bloques', async () => {
    renderPage({ horarios: [], bloques: [] });

    expect(await screen.findByText('No hay bloques no disponibles')).toBeInTheDocument();
  });

  it('crea un bloque enviando las fechas en UTC y lo agrega a la lista', async () => {
    const { createdBlocks } = renderPage();
    const user = userEvent.setup();

    await fillBlock(user);
    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Capacitación');
    await user.click(screen.getByRole('button', { name: 'Agregar bloque' }));

    expect(await screen.findByTestId('bloque-b2')).toHaveTextContent('Capacitación');
    expect(createdBlocks).toEqual([
      {
        inicio: '2026-11-13T14:00:00.000Z',
        fin: '2026-11-13T15:30:00.000Z',
        motivo: 'Capacitación',
      },
    ]);
  });

  it('muestra el error si el bloque choca con una cita', async () => {
    renderPage();
    server.use(
      http.post(`${API}/dentists/d1/blocks`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'BLOQUE_CON_CITAS',
            message: 'Hay citas activas en ese horario',
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    await fillBlock(user);
    await user.click(screen.getByRole('button', { name: 'Agregar bloque' }));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Hay citas activas en ese horario',
    );
  });

  it('borra un bloque al confirmar', async () => {
    const { deletedBlocks } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar bloque' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar bloque' }),
    );

    expect(await screen.findByText('No hay bloques no disponibles')).toBeInTheDocument();
    expect(deletedBlocks).toEqual(['b1']);
  });

  it('no borra el bloque si se cancela la confirmación', async () => {
    const { deletedBlocks } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar bloque' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(deletedBlocks).toEqual([]);
    expect(screen.getByTestId('bloque-b1')).toBeInTheDocument();
  });

  it('muestra el error si no se puede cargar la disponibilidad', async () => {
    renderPage(undefined, [
      http.get(`${API}/dentists/d1/availability`, () =>
        HttpResponse.json(
          { statusCode: 404, error: 'X', message: 'Odontólogo no encontrado' },
          {
            status: 404,
          },
        ),
      ),
    ]);

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Odontólogo no encontrado',
    );
  });

  it('reinicia tramos y bloques al cambiar de odontólogo sin desmontar la página', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/dentists/d1`, () =>
        HttpResponse.json(testAdminDentist({ id: 'd1', nombre: 'Dra. Laura Gómez' })),
      ),
      http.get(`${API}/dentists/d1/availability`, () => HttpResponse.json(WITH_DATA)),
      http.get(`${API}/dentists/d2`, () =>
        HttpResponse.json(testAdminDentist({ id: 'd2', nombre: 'Dr. Carlos Rojas' })),
      ),
      http.get(`${API}/dentists/d2/availability`, () =>
        HttpResponse.json({
          horarios: [{ id: 'h2', diaSemana: 3, minutoInicio: 840, minutoFin: 1080 }],
          bloques: [],
        }),
      ),
    );
    renderWithProviders(
      <>
        <Link to="/admin/odontologos/d2/horarios">Ir a d2</Link>
        <Routes>
          <Route path="/admin/odontologos/:id/horarios" element={<HorariosOdontologoPage />} />
        </Routes>
      </>,
      { route: '/admin/odontologos/d1/horarios' },
    );

    const timeRange1 = await screen.findByTestId('tramo-0');
    expect(within(timeRange1).getByLabelText('Día')).toHaveTextContent('Lunes');

    await user.click(screen.getByRole('link', { name: 'Ir a d2' }));

    await waitFor(() =>
      expect(within(screen.getByTestId('tramo-0')).getByLabelText('Día')).toHaveTextContent(
        'Miércoles',
      ),
    );
    expect(within(screen.getByTestId('tramo-0')).getByLabelText('Desde')).toHaveValue('14:00');
    expect(within(screen.getByTestId('tramo-0')).getByLabelText('Hasta')).toHaveValue('18:00');
    expect(screen.getByText('No hay bloques no disponibles')).toBeInTheDocument();
  });
});
