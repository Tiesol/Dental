import { loginComo } from './fixtures/auth';
import { MANIANA } from './fixtures/entorno';
import { expect, test } from './fixtures/seed';
import { MisCitasPage } from './pages/MisCitasPage';
import { ReservaPage } from './pages/ReservaPage';

const LAS_NUEVE = '2026-11-10T13:00:00.000Z';
const NUEVE_Y_MEDIA = '2026-11-10T13:30:00.000Z';

test('E2E 02 - evitar doble reserva: un horario ocupado no se ofrece', async ({ page, seed }) => {
  await seed.cita({ paciente: 'paciente1', horaInicio: LAS_NUEVE });
  await loginComo(page, 'paciente2');
  const reserva = new ReservaPage(page);

  await reserva.hastaLosHorarios('Limpieza dental', 'Dra. Laura Gómez', MANIANA);

  await expect(reserva.slot('09:30')).toBeVisible();
  await expect(reserva.slot('09:00')).toHaveCount(0);
  await expect(reserva.slot('09:15')).toHaveCount(0);
});

test('E2E 02 - evitar doble reserva: si otro se adelanta, el sistema no permite confirmar', async ({
  page,
  seed,
}) => {
  await loginComo(page, 'paciente2');
  const reserva = new ReservaPage(page);
  await reserva.hastaLosHorarios('Limpieza dental', 'Dra. Laura Gómez', MANIANA);
  await reserva.elegirSlot('09:30');

  await seed.cita({ paciente: 'paciente1', horaInicio: NUEVE_Y_MEDIA });
  const respuesta = page.waitForResponse(
    (r) => r.url().endsWith('/appointments') && r.request().method() === 'POST',
  );
  await reserva.confirmar();

  expect((await respuesta).status()).toBe(409);
  await expect(page.getByTestId('error-mensaje')).toHaveText('El horario ya no está disponible');
  await expect(reserva.slot('09:00')).toBeVisible();
  await expect(reserva.slot('09:30')).toHaveCount(0);
  const misCitas = new MisCitasPage(page);
  await misCitas.abrir();
  await expect(page.getByText('No tienes citas próximas')).toBeVisible();
  await expect(misCitas.filas()).toHaveCount(0);
});
