import { expect, test } from '@playwright/test';

// Smoke test: comprueba que la aplicación arranca y que las rutas públicas responden.
// No necesita backend. Los escenarios E2E 01 a 07 del PDF se agregan en archivos
// 01-reservar.e2e.ts ... 07-control-acceso.e2e.ts cuando existan las pantallas (skill e2e-playwright).

test('la raíz sin sesión redirige a la página de inicio de sesión', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
  await expect(page.getByTestId('btn-login')).toBeEnabled();
});

test('desde el login se puede ir al registro de paciente', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('link', { name: 'Regístrate' }).click();

  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.getByRole('heading', { name: 'Crear cuenta de paciente' })).toBeVisible();
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Apellido')).toBeVisible();
  await expect(page.getByTestId('btn-registrar')).toBeEnabled();
});
