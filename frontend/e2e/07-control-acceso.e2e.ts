import { loginComo } from './fixtures/auth';
import { expect, test } from './fixtures/seed';

test('E2E 07 - control de acceso: un paciente no puede abrir la cita de otro', async ({
  page,
  seed,
}) => {
  const cita = await seed.cita({
    paciente: 'paciente1',
    horaInicio: '2026-11-10T13:00:00.000Z',
  });
  await loginComo(page, 'paciente2');

  const respuesta = page.waitForResponse((r) => r.url().endsWith(`/appointments/${cita.id}`));
  await page.goto(`/mis-citas/${cita.id}`);

  expect((await respuesta).status()).toBe(403);
  await expect(page.getByTestId('error-mensaje')).toHaveText('No tienes acceso a esta cita');
  await expect(page.getByTestId('datos-cita')).toHaveCount(0);
  await expect(page.getByTestId('estado-cita')).toHaveCount(0);
  await expect(page.getByText('Limpieza dental')).toHaveCount(0);
});

test('E2E 07 - un odontólogo no entra a las pantallas de paciente', async ({ page, seed }) => {
  const cita = await seed.cita({
    paciente: 'paciente1',
    horaInicio: '2026-11-10T13:00:00.000Z',
  });
  await loginComo(page, 'odontologo');

  await page.goto(`/mis-citas/${cita.id}`);

  await expect(page.getByTestId('datos-cita')).toHaveCount(0);
  await expect(page.getByText('Limpieza dental')).toHaveCount(0);
});
