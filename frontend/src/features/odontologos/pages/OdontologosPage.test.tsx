import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { odontologoPublicoDePrueba, servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { OdontologosPage } from './OdontologosPage';

function apiPublica() {
  server.use(
    http.get(`${API}/services`, () => HttpResponse.json([servicioDePrueba()])),
    http.get(`${API}/dentists`, ({ request }) => {
      const filtro = new URL(request.url).searchParams.get('serviceId');
      return HttpResponse.json(filtro === 'vacio' ? [] : [odontologoPublicoDePrueba()]);
    }),
  );
}

describe('OdontologosPage', () => {
  it('muestra cada odontólogo con su especialidad y sus servicios', async () => {
    apiPublica();

    renderWithProviders(<OdontologosPage />);

    const tarjeta = within(await screen.findByTestId('odontologo-d1'));
    expect(tarjeta.getByRole('heading', { name: 'Dra. Laura Gómez' })).toBeInTheDocument();
    expect(tarjeta.getByText('Odontología general')).toBeInTheDocument();
    expect(tarjeta.getByText('Limpieza dental · 30 min')).toBeInTheDocument();
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
    apiPublica();
    server.use(
      http.get(`${API}/services`, () => HttpResponse.json([servicioDePrueba({ id: 'vacio' })])),
    );
    const user = userEvent.setup();
    renderWithProviders(<OdontologosPage />);
    await screen.findByTestId('odontologo-d1');
    await screen.findByRole('option', { name: 'Limpieza dental' });

    await user.selectOptions(screen.getByLabelText('Servicio'), 'vacio');

    expect(
      await screen.findByRole('heading', {
        name: 'Ningún odontólogo realiza este servicio por ahora',
      }),
    ).toBeInTheDocument();
  });
});
