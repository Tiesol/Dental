import { loginAs } from './fixtures/auth';
import { API_URL } from './fixtures/environment';
import { expect, test } from './fixtures/seed';

// Comprueba el entorno de los escenarios del PDF: frontend, backend y base de datos reales.

test('un paciente del seed inicia sesión por la interfaz contra el backend real', async ({
  page,
}) => {
  await loginAs(page, 'paciente1');

  await expect(page).toHaveURL(/\/mis-citas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mis citas' })).toBeVisible();
});

test('una contraseña incorrecta muestra el error del backend', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('paciente1@e2e.com');
  await page.getByLabel('Contraseña').fill('equivocada');

  await page.getByTestId('btn-login').click();

  await expect(page.getByTestId('error-mensaje')).toHaveText('Credenciales inválidas');
});

test('el navegador y el backend comparten la hora fija', async ({ page, request }) => {
  const inBrowser = await page.evaluate(() => new Date().toISOString());
  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email: 'paciente1@e2e.com', password: 'Paciente12345' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const dentists = await request.get(`${API_URL}/dentists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const [dentist] = (await dentists.json()) as {
    id: string;
    servicios: { id: string }[];
  }[];

  const today = await request.get(`${API_URL}/dentists/${dentist.id}/slots`, {
    params: { serviceId: dentist.servicios[0].id, fecha: inBrowser.slice(0, 10) },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  expect(inBrowser).toBe('2026-11-09T12:00:00.000Z');
  const slots = (await today.json()) as { inicio: string }[];
  expect(slots[0].inicio).toBe('2026-11-09T13:00:00.000Z');
});
