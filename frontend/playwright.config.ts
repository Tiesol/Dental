import { defineConfig, devices } from '@playwright/test';
import { NOW, BACKEND_PORT, FRONTEND_PORT } from './e2e/fixtures/environment';

// E2E con la interfaz real (skill e2e-playwright): levanta el frontend con Vite y el backend en
// modo test contra PostgreSQL, en puertos propios para no chocar con los de desarrollo. No
// reutiliza servidores: uno de desarrollo no tendría el reloj fijo ni el seed.
//
// En el CI, los E2E completos necesitan el job con PostgreSQL, que define E2E_CON_BACKEND. Sin esa
// variable solo corre el smoke, que no usa el backend.
const smokeOnly = !!process.env.CI && !process.env.E2E_CON_BACKEND;

const backend = {
  command: 'npm run prisma:migrate:test && npm run start:test',
  cwd: '../backend',
  url: `http://localhost:${BACKEND_PORT}/api/docs`,
  env: {
    PORT: String(BACKEND_PORT),
    FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
    CLOCK_NOW: NOW,
  },
  reuseExistingServer: false,
  timeout: 120_000,
};

const frontend = {
  command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
  url: `http://localhost:${FRONTEND_PORT}`,
  env: { VITE_API_URL: `http://localhost:${BACKEND_PORT}/api/v1` },
  reuseExistingServer: false,
  timeout: 60_000,
};

export default defineConfig({
  testDir: './e2e',
  testMatch: smokeOnly ? '**/00-smoke.e2e.ts' : '**/*.e2e.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'es-ES',
    timezoneId: 'America/La_Paz',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: smokeOnly ? [frontend] : [backend, frontend],
});
