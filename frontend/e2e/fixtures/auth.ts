import { expect, type Page } from '@playwright/test';

const CREDENCIALES = {
  admin: { email: 'admin@e2e.com', password: 'Admin12345' },
  paciente1: { email: 'paciente1@e2e.com', password: 'Paciente12345' },
  paciente2: { email: 'paciente2@e2e.com', password: 'Paciente12345' },
  odontologo: { email: 'odontologo@e2e.com', password: 'Odontologo12345' },
} as const;

export type Usuario = keyof typeof CREDENCIALES;

// Inicia sesión por la interfaz real. No reutiliza sesiones entre escenarios: el seed recrea los
// usuarios, así que un token anterior ya no serviría.
export async function loginComo(page: Page, usuario: Usuario): Promise<void> {
  const { email, password } = CREDENCIALES[usuario];
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByTestId('btn-login').click();
  await expect(page).not.toHaveURL(/\/login$/);
}
