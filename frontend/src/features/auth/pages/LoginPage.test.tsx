import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '@/api/token';
import { usuarioDePrueba } from '@/test/factories';
import { API, CREDENCIALES_VALIDAS, TOKEN_DE_PRUEBA } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';
import { LoginPage } from './LoginPage';

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Inicio</h1>} />
    </Routes>,
    { route: '/login' },
  );
}

describe('LoginPage', () => {
  it('muestra el mensaje de error del backend cuando las credenciales son incorrectas', async () => {
    // Arrange
    const user = userEvent.setup();
    renderLogin();

    // Act
    await user.type(screen.getByLabelText('Email'), 'ana@mail.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(tokenStore.get()).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument();
  });

  it('con credenciales correctas guarda el token y navega al inicio', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), CREDENCIALES_VALIDAS.email);
    await user.type(screen.getByLabelText('Contraseña'), CREDENCIALES_VALIDAS.password);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
    expect(tokenStore.get()).toBe(TOKEN_DE_PRUEBA);
  });

  it('deshabilita el botón mientras la petición está en curso', async () => {
    // Arrange: un login que tarda, para poder observar el estado intermedio
    server.use(
      http.post(`${API}/auth/login`, async () => {
        await delay(150);
        return HttpResponse.json({ accessToken: TOKEN_DE_PRUEBA, user: usuarioDePrueba() });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Email'), CREDENCIALES_VALIDAS.email);
    await user.type(screen.getByLabelText('Contraseña'), CREDENCIALES_VALIDAS.password);

    // Act
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    // Assert
    expect(await screen.findByRole('button', { name: 'Ingresando…' })).toBeDisabled();
    await screen.findByRole('heading', { name: 'Inicio' });
  });
});
