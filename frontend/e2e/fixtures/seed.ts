import { test as base, type APIRequestContext } from '@playwright/test';
import { AHORA, API_URL } from './entorno';

export type DatosCita = {
  paciente: 'paciente1' | 'paciente2';
  horaInicio: string;
  estado?: 'PENDIENTE' | 'CONFIRMADA' | 'EN_ATENCION' | 'FINALIZADA' | 'CANCELADA';
  observacion?: string;
};

export type Seed = {
  // Crea por la API de seed una cita que el escenario necesita ya existente.
  cita: (datos: DatosCita) => Promise<{ id: string }>;
};

async function sembrar(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${API_URL}/e2e/seed`);
  if (!res.ok()) {
    throw new Error(`El seed de E2E respondió ${res.status()}`);
  }
}

// Cada escenario arranca con los datos conocidos y con el navegador en la misma hora que el
// backend. `auto` hace que el seed corra aunque el escenario no use el fixture.
export const test = base.extend<{ seed: Seed }>({
  seed: [
    async ({ request }, usar) => {
      await sembrar(request);
      await usar({
        cita: async (datos) => {
          const res = await request.post(`${API_URL}/e2e/citas`, { data: datos });
          if (!res.ok()) {
            throw new Error(`Crear la cita de E2E respondió ${res.status()}`);
          }
          return (await res.json()) as { id: string };
        },
      });
    },
    { auto: true },
  ],
  page: async ({ page }, usar) => {
    await page.clock.setFixedTime(new Date(AHORA));
    await usar(page);
  },
});

export { expect } from '@playwright/test';
