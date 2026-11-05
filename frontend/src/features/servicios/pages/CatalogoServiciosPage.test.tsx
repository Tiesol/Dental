import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { CatalogoServiciosPage } from './CatalogoServiciosPage';

describe('CatalogoServiciosPage', () => {
  it('muestra cada servicio con su duración y su precio', async () => {
    server.use(http.get(`${API}/services`, () => HttpResponse.json([servicioDePrueba()])));

    renderWithProviders(<CatalogoServiciosPage />);

    const servicio = within(await screen.findByTestId('servicio-s1'));
    expect(servicio.getByRole('heading', { name: 'Limpieza dental' })).toBeInTheDocument();
    expect(servicio.getByText('45 min')).toBeInTheDocument();
    expect(servicio.getByText('Bs 150,00')).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no hay servicios', async () => {
    server.use(http.get(`${API}/services`, () => HttpResponse.json([])));

    renderWithProviders(<CatalogoServiciosPage />);

    expect(
      await screen.findByRole('heading', { name: 'Por ahora no hay servicios disponibles' }),
    ).toBeInTheDocument();
  });

  it('muestra el mensaje de sin conexión si la API no responde', async () => {
    server.use(http.get(`${API}/services`, () => HttpResponse.error()));

    renderWithProviders(<CatalogoServiciosPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    );
  });
});
