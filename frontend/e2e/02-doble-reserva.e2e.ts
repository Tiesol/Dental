import { loginAs } from './fixtures/auth';
import { TOMORROW } from './fixtures/environment';
import { expect, test } from './fixtures/seed';
import { MisCitasPage } from './pages/MisCitasPage';
import { ReservaPage } from './pages/ReservaPage';

const NINE_AM = '2026-11-10T13:00:00.000Z';
const NINE_THIRTY = '2026-11-10T13:30:00.000Z';

test('E2E 02 - evitar doble reserva: un horario ocupado no se ofrece', async ({ page, seed }) => {
  await seed.appointment({ paciente: 'paciente1', horaInicio: NINE_AM });
  await loginAs(page, 'paciente2');
  const booking = new ReservaPage(page);

  await booking.upToSlots('Limpieza dental', 'Dra. Laura Gómez', TOMORROW);

  await expect(booking.slot('09:30')).toBeVisible();
  await expect(booking.slot('09:00')).toHaveCount(0);
  await expect(booking.slot('09:15')).toHaveCount(0);
});

test('E2E 02 - evitar doble reserva: si otro se adelanta, el sistema no permite confirmar', async ({
  page,
  seed,
}) => {
  await loginAs(page, 'paciente2');
  const booking = new ReservaPage(page);
  await booking.upToSlots('Limpieza dental', 'Dra. Laura Gómez', TOMORROW);
  await booking.chooseSlot('09:30');

  await seed.appointment({ paciente: 'paciente1', horaInicio: NINE_THIRTY });
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/appointments') && r.request().method() === 'POST',
  );
  await booking.confirm();

  expect((await response).status()).toBe(409);
  await expect(page.getByTestId('error-mensaje')).toHaveText('El horario ya no está disponible');
  await expect(booking.slot('09:00')).toBeVisible();
  await expect(booking.slot('09:30')).toHaveCount(0);
  const myAppointments = new MisCitasPage(page);
  await myAppointments.open();
  await expect(page.getByText('No tienes citas próximas')).toBeVisible();
  await expect(myAppointments.rows()).toHaveCount(0);
});
