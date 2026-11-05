import { loginComo } from './fixtures/auth';
import { API_URL } from './fixtures/entorno';
import { expect, test } from './fixtures/seed';

// Comprueba el entorno de los escenarios del PDF: frontend, backend y base de datos reales.

test('un paciente del seed inicia sesión por la interfaz contra el backend real', async ({
  page,
}) => {
  await loginComo(page, 'paciente1');

  await expect(page.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeVisible();
});

test('una contraseña incorrecta muestra el error del backend', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('paciente1@e2e.com');
  await page.getByLabel('Contraseña').fill('equivocada');

  await page.getByTestId('btn-login').click();

  await expect(page.getByTestId('error-mensaje')).toHaveText('Credenciales inválidas');
});

test('el navegador y el backend comparten la hora fija', async ({ page, request }) => {
  const enNavegador = await page.evaluate(() => new Date().toISOString());
  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email: 'paciente1@e2e.com', password: 'Paciente12345' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const dentistas = await request.get(`${API_URL}/dentists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const [odontologo] = (await dentistas.json()) as {
    id: string;
    servicios: { id: string }[];
  }[];

  const hoy = await request.get(`${API_URL}/dentists/${odontologo.id}/slots`, {
    params: { serviceId: odontologo.servicios[0].id, fecha: enNavegador.slice(0, 10) },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  expect(enNavegador).toBe('2026-11-09T12:00:00.000Z');
  const slots = (await hoy.json()) as { inicio: string }[];
  expect(slots[0].inicio).toBe('2026-11-09T13:00:00.000Z');
});
