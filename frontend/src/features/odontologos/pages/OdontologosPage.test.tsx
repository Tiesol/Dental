import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { testPublicDentist, testService } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { chooseOption, renderWithProviders } from '@/test/utils';
import { OdontologosPage } from './OdontologosPage';

function mockPublicApi() {
  server.use(
    http.get(`${API}/services`, () => HttpResponse.json([testService()])),
    http.get(`${API}/dentists`, ({ request }) => {
      const filter = new URL(request.url).searchParams.get('serviceId');
      return HttpResponse.json(filter === 'vacio' ? [] : [testPublicDentist()]);
    }),
  );
}

describe('OdontologosPage', () => {
  it('muestra cada odontólogo con su especialidad y sus servicios', async () => {
    mockPublicApi();

    renderWithProviders(<OdontologosPage />);

    const card = within(await screen.findByTestId('odontologo-d1'));
    expect(card.getByRole('heading', { name: 'Dra. Laura Gómez' })).toBeInTheDocument();
    expect(card.getByText('Odontología general')).toBeInTheDocument();
    expect(card.getByText('Limpieza dental · 30 min')).toBeInTheDocument();
  });

  it('cada odontólogo tiene un enlace que abre la reserva con él ya elegido', async () => {
    mockPublicApi();

    renderWithProviders(<OdontologosPage />);

    const card = within(await screen.findByTestId('odontologo-d1'));
    expect(card.getByRole('link', { name: 'Reservar con Dra. Laura Gómez' })).toHaveAttribute(
      'href',
      '/reservar?odontologo=d1',
    );
  });

  it('muestra un estado vacío cuando no hay odontólogos', async () => {
    server.use(
      http.get(`${API}/services`, () => HttpResponse.json([])),
      http.get(`${API}/dentists`, () => HttpResponse.json([])),
    );

    renderWithProviders(<OdontologosPage />);

    expect(
      await screen.findByRole('heading', { name: 'Por ahora no hay odontólogos disponibles' }),
    ).toBeInTheDocument();
  });

  it('al filtrar por un servicio sin odontólogos muestra un estado vacío propio', async () => {
    mockPublicApi();
    server.use(
      http.get(`${API}/services`, () => HttpResponse.json([testService({ id: 'vacio' })])),
    );
    const user = userEvent.setup();
    renderWithProviders(<OdontologosPage />);
    await screen.findByTestId('odontologo-d1');

    await chooseOption(user, await screen.findByLabelText('Servicio'), 'Limpieza dental');

    expect(
      await screen.findByRole('heading', {
        name: 'Ningún odontólogo realiza este servicio por ahora',
      }),
    ).toBeInTheDocument();
  });
});
