import { test as base, type APIRequestContext } from '@playwright/test';
import { NOW, API_URL } from './environment';

export type AppointmentData = {
  paciente: 'paciente1' | 'paciente2';
  horaInicio: string;
  estado?: 'PENDIENTE' | 'CONFIRMADA' | 'EN_ATENCION' | 'FINALIZADA' | 'CANCELADA';
  observacion?: string;
};

export type Seed = {
  // Crea por la API de seed una cita que el escenario necesita ya existente.
  appointment: (data: AppointmentData) => Promise<{ id: string }>;
};

async function seedDatabase(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${API_URL}/e2e/seed`);
  if (!res.ok()) {
    throw new Error(`El seed de E2E respondió ${res.status()}`);
  }
}

// Cada escenario arranca con los datos conocidos y con el navegador en la misma hora que el
// backend. `auto` hace que el seed corra aunque el escenario no use el fixture.
export const test = base.extend<{ seed: Seed }>({
  seed: [
    async ({ request }, provide) => {
      await seedDatabase(request);
      await provide({
        appointment: async (data) => {
          const res = await request.post(`${API_URL}/e2e/citas`, { data: data });
          if (!res.ok()) {
            throw new Error(`Crear la cita de E2E respondió ${res.status()}`);
          }
          return (await res.json()) as { id: string };
        },
      });
    },
    { auto: true },
  ],
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(new Date(NOW));
    await provide(page);
  },
});

export { expect } from '@playwright/test';
