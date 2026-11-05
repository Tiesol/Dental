import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { odontologoAdminDePrueba, servicioDePrueba } from '@/test/factories';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { NuevoOdontologoPage } from './NuevoOdontologoPage';

function renderPagina() {
  server.use(http.get(`${API}/services`, () => HttpResponse.json([servicioDePrueba()])));
  renderWithProviders(
    <Routes>
      <Route path="/admin/odontologos/nuevo" element={<NuevoOdontologoPage />} />
      <Route path="/admin/odontologos" element={<h1>Listado</h1>} />
    </Routes>,
    { route: '/admin/odontologos/nuevo' },
  );
}

async function llenarFormulario() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nombre'), 'Dr. Juan Rojas');
  await user.type(screen.getByLabelText('Especialidad'), 'Ortodoncia');
  await user.click(await screen.findByRole('checkbox', { name: /Limpieza dental/ }));
  await user.type(screen.getByLabelText('Email (para iniciar sesión)'), 'juan@clinica.com');
  await user.type(screen.getByLabelText('Contraseña inicial'), 'Secreta12345');
  return user;
}

describe('NuevoOdontologoPage', () => {
  it('registra al odontólogo con sus servicios y vuelve al listado', async () => {
    const recibidos: unknown[] = [];
    server.use(
      http.post(`${API}/dentists`, async ({ request }) => {
        recibidos.push(await request.json());
        return HttpResponse.json(odontologoAdminDePrueba(), { status: 201 });
      }),
    );
    renderPagina();
    const user = await llenarFormulario();

    await user.click(screen.getByRole('button', { name: 'Registrar odontólogo' }));

    expect(await screen.findByRole('heading', { name: 'Listado' })).toBeInTheDocument();
    expect(recibidos).toEqual([
      {
        nombre: 'Dr. Juan Rojas',
        especialidad: 'Ortodoncia',
        email: 'juan@clinica.com',
        password: 'Secreta12345',
        serviceIds: ['s1'],
      },
    ]);
  });

  it('muestra el error del backend y conserva el formulario', async () => {
    server.use(
      http.post(`${API}/dentists`, () =>
        HttpResponse.json({ statusCode: 409, message: 'El email ya existe' }, { status: 409 }),
      ),
    );
    renderPagina();
    const user = await llenarFormulario();

    await user.click(screen.getByRole('button', { name: 'Registrar odontólogo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El email ya existe');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Dr. Juan Rojas');
  });

  it('el enlace para volver al listado está en la cabecera', async () => {
    renderPagina();

    expect(await screen.findByRole('link', { name: 'Volver al listado' })).toHaveAttribute(
      'href',
      '/admin/odontologos',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo odontólogo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al listado' }).closest('form')).toBeNull();
  });
});
