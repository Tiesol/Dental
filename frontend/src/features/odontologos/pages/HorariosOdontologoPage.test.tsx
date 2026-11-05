import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type RequestHandler } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { AvailabilityResponse } from '@/api/types';
import { odontologoAdminDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { HorariosOdontologoPage } from './HorariosOdontologoPage';

const CON_DATOS: AvailabilityResponse = {
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

function renderPagina(
  disponibilidad: AvailabilityResponse = CON_DATOS,
  extras: RequestHandler[] = [],
) {
  const guardados: unknown[] = [];
  const bloquesCreados: unknown[] = [];
  const bloquesBorrados: string[] = [];
  server.use(
    http.get(`${API}/dentists/d1`, () => HttpResponse.json(odontologoAdminDePrueba())),
    http.get(`${API}/dentists/d1/availability`, () => HttpResponse.json(disponibilidad)),
    http.put(`${API}/dentists/d1/availability`, async ({ request }) => {
      const cuerpo = (await request.json()) as { horarios: { diaSemana: number }[] };
      guardados.push(cuerpo);
      return HttpResponse.json({
        horarios: cuerpo.horarios.map((h, i) => ({ id: `n${i}`, ...h })),
        bloques: disponibilidad.bloques,
      });
    }),
    http.post(`${API}/dentists/d1/blocks`, async ({ request }) => {
      const cuerpo = (await request.json()) as { inicio: string; fin: string; motivo?: string };
      bloquesCreados.push(cuerpo);
      return HttpResponse.json(
        { id: 'b2', motivo: null, ...cuerpo },
        {
          status: 201,
        },
      );
    }),
    http.delete(`${API}/dentists/d1/blocks/:blockId`, ({ params }) => {
      bloquesBorrados.push(params.blockId as string);
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
  return { guardados, bloquesCreados, bloquesBorrados };
}

describe('HorariosOdontologoPage', () => {
  it('muestra el título con el nombre del odontólogo', async () => {
    renderPagina();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Horarios y bloques' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Dra. Laura Gómez')).toBeInTheDocument();
  });

  it('muestra los tramos actuales con su día y sus horas', async () => {
    renderPagina();

    const tramo = await screen.findByTestId('tramo-0');

    expect(within(tramo).getByLabelText('Día')).toHaveValue('1');
    expect(within(tramo).getByLabelText('Desde')).toHaveValue('09:00');
    expect(within(tramo).getByLabelText('Hasta')).toHaveValue('12:00');
  });

  it('avisa cuando el odontólogo no tiene horarios', async () => {
    renderPagina({ horarios: [], bloques: [] });

    expect(await screen.findByText('Todavía no tiene horarios de atención')).toBeInTheDocument();
  });

  it('agrega un tramo y guarda todos los horarios en minutos', async () => {
    const { guardados } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Agregar tramo' }));
    const nuevo = screen.getByTestId('tramo-1');
    await user.selectOptions(within(nuevo).getByLabelText('Día'), 'Martes');
    await user.clear(within(nuevo).getByLabelText('Desde'));
    await user.type(within(nuevo).getByLabelText('Desde'), '14:00');
    await user.clear(within(nuevo).getByLabelText('Hasta'));
    await user.type(within(nuevo).getByLabelText('Hasta'), '18:30');
    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Horarios guardados');
    expect(guardados).toEqual([
      {
        horarios: [
          { diaSemana: 1, minutoInicio: 540, minutoFin: 720 },
          { diaSemana: 2, minutoInicio: 840, minutoFin: 1110 },
        ],
      },
    ]);
  });

  it('quita un tramo antes de guardar', async () => {
    const { guardados } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar tramo 1' }));
    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Horarios guardados');
    expect(guardados).toEqual([{ horarios: [] }]);
  });

  it('muestra el mensaje del backend si los horarios son inválidos', async () => {
    renderPagina();
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
    renderPagina();

    const bloque = await screen.findByTestId('bloque-b1');

    expect(bloque).toHaveTextContent('jueves, 12 de noviembre de 2026, 10:00');
    expect(bloque).toHaveTextContent('Congreso');
  });

  it('avisa cuando no hay bloques', async () => {
    renderPagina({ horarios: [], bloques: [] });

    expect(await screen.findByText('No hay bloques no disponibles')).toBeInTheDocument();
  });

  it('crea un bloque enviando las fechas en UTC y lo agrega a la lista', async () => {
    const { bloquesCreados } = renderPagina();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Inicio'), '2026-11-13T10:00');
    await user.type(screen.getByLabelText('Fin'), '2026-11-13T11:30');
    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Capacitación');
    await user.click(screen.getByRole('button', { name: 'Agregar bloque' }));

    expect(await screen.findByTestId('bloque-b2')).toHaveTextContent('Capacitación');
    expect(bloquesCreados).toEqual([
      {
        inicio: '2026-11-13T14:00:00.000Z',
        fin: '2026-11-13T15:30:00.000Z',
        motivo: 'Capacitación',
      },
    ]);
  });

  it('muestra el error si el bloque choca con una cita', async () => {
    renderPagina();
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

    await user.type(await screen.findByLabelText('Inicio'), '2026-11-13T10:00');
    await user.type(screen.getByLabelText('Fin'), '2026-11-13T11:30');
    await user.click(screen.getByRole('button', { name: 'Agregar bloque' }));

    expect(await screen.findByTestId('error-mensaje')).toHaveTextContent(
      'Hay citas activas en ese horario',
    );
  });

  it('borra un bloque al confirmar', async () => {
    const { bloquesBorrados } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar bloque' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar bloque' }),
    );

    expect(await screen.findByText('No hay bloques no disponibles')).toBeInTheDocument();
    expect(bloquesBorrados).toEqual(['b1']);
  });

  it('no borra el bloque si se cancela la confirmación', async () => {
    const { bloquesBorrados } = renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quitar bloque' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(bloquesBorrados).toEqual([]);
    expect(screen.getByTestId('bloque-b1')).toBeInTheDocument();
  });

  it('muestra el error si no se puede cargar la disponibilidad', async () => {
    renderPagina(undefined, [
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
});
