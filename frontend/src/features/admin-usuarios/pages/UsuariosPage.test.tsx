import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { testUser, testUserDetail } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { UsuariosPage } from './UsuariosPage';

const ADMIN = testUserDetail({
  id: 'admin',
  role: 'ADMIN',
  nombre: 'Administrador',
  email: 'admin@clinica.com',
  paciente: null,
});
const ANA = testUserDetail({ id: 'u1', nombre: 'Ana Pérez', email: 'ana@mail.com' });

// Registra el listado y devuelve los cuerpos recibidos en PATCH /users/:id/estado.
function mockUsersApi(users = [ADMIN, ANA]) {
  const changes: unknown[] = [];
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json(testUser({ id: 'admin', role: 'ADMIN' }))),
    http.get(`${API}/users`, () => HttpResponse.json(users)),
    http.patch(`${API}/users/:id/estado`, async ({ request, params }) => {
      const body = (await request.json()) as { activo: boolean };
      changes.push(body);
      const user = users.find((u) => u.id === params.id);
      return HttpResponse.json({ ...user, activo: body.activo });
    }),
  );
  return changes;
}

function renderPage() {
  return renderWithProviders(<UsuariosPage />, { withSession: true });
}

describe('UsuariosPage', () => {
  it('pide confirmación antes de deshabilitar y no llama a la API si se cancela', async () => {
    const changes = mockUsersApi();
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('usuario-u1');

    await user.click(within(row).getByRole('button', { name: 'Deshabilitar' }));
    const dialog = screen.getByRole('dialog', { name: '¿Deshabilitar a Ana Pérez?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(changes).toEqual([]);
    expect(within(row).getByText('Habilitado')).toBeInTheDocument();
  });

  it('al confirmar deshabilita al usuario y actualiza su estado en la fila', async () => {
    const changes = mockUsersApi();
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('usuario-u1');

    await user.click(within(row).getByRole('button', { name: 'Deshabilitar' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Deshabilitar' }));

    expect(await within(row).findByText('Deshabilitado')).toBeInTheDocument();
    expect(changes).toEqual([{ activo: false }]);
  });

  it('habilitar no pide confirmación', async () => {
    const changes = mockUsersApi([ADMIN, { ...ANA, activo: false }]);
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('usuario-u1');

    await user.click(within(row).getByRole('button', { name: 'Habilitar' }));

    expect(await within(row).findByText('Habilitado')).toBeInTheDocument();
    expect(changes).toEqual([{ activo: true }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el ADMIN no puede deshabilitar su propia cuenta', async () => {
    mockUsersApi();
    renderPage();

    const row = await screen.findByTestId('usuario-admin');

    expect(within(row).getByRole('button', { name: 'Deshabilitar' })).toBeDisabled();
  });

  it('muestra cuántos usuarios coinciden con la búsqueda', async () => {
    mockUsersApi();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('usuario-u1');

    await user.type(screen.getByLabelText('Buscar'), 'ana');

    expect(await screen.findByText('Mostrando 1 de 2 usuarios')).toBeInTheDocument();
    expect(screen.queryByTestId('usuario-admin')).not.toBeInTheDocument();
  });

  it('busca por email sin distinguir mayúsculas ni minúsculas', async () => {
    mockUsersApi([ADMIN, { ...ANA, email: 'Ana.Perez@Mail.com' }]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('usuario-u1');

    await user.type(screen.getByLabelText('Buscar'), 'ana.perez@mail');

    expect(await screen.findByText('Mostrando 1 de 2 usuarios')).toBeInTheDocument();
    expect(screen.getByTestId('usuario-u1')).toBeInTheDocument();
    expect(screen.queryByTestId('usuario-admin')).not.toBeInTheDocument();
  });

  it('muestra un estado vacío cuando nada coincide con la búsqueda', async () => {
    mockUsersApi();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('usuario-u1');

    await user.type(screen.getByLabelText('Buscar'), 'zzz');

    expect(
      await screen.findByRole('heading', { name: 'No hay usuarios que coincidan' }),
    ).toBeInTheDocument();
  });

  it('muestra el error del backend si no se puede cargar el listado', async () => {
    mockUsersApi();
    server.use(
      http.get(`${API}/users`, () =>
        HttpResponse.json({ statusCode: 403, message: 'No autorizado' }, { status: 403 }),
      ),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado');
  });
});
