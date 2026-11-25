import { loginAs } from './fixtures/auth';
import { TOMORROW } from './fixtures/environment';
import { expect, test } from './fixtures/seed';
import { MisCitasPage } from './pages/MisCitasPage';
import { ReservaPage } from './pages/ReservaPage';

test('E2E 01 - reservar cita: el paciente la ve en Mis citas', async ({ page }) => {
  await loginAs(page, 'paciente1');
  const booking = new ReservaPage(page);

  await booking.open();
  await booking.chooseService('Limpieza dental');
  await booking.chooseDentist('Dra. Laura Gómez');
  await booking.chooseDate(TOMORROW);
  await booking.chooseSlot('09:00');
  await expect(page.getByTestId('resumen-reserva')).toContainText('09:00 - 09:30');
  await booking.confirm();

  await expect(page).toHaveURL(/\/mis-citas$/);
  await expect(page.getByRole('status').filter({ hasText: 'Cita reservada' })).toBeVisible();
  const appointments = new MisCitasPage(page).rows();
  await expect(appointments).toHaveCount(1);
  await expect(appointments.first()).toContainText('Limpieza dental');
  await expect(appointments.first()).toContainText('Dra. Laura Gómez');
  await expect(appointments.first()).toContainText('martes, 10 de noviembre de 2026');
  await expect(appointments.first()).toContainText('09:00 - 09:30');
  await expect(appointments.first().getByTestId('estado-cita')).toHaveText('PENDIENTE');
});

test('E2E 01 - el catálogo no ofrece un servicio deshabilitado', async ({ page }) => {
  await loginAs(page, 'paciente1');
  const booking = new ReservaPage(page);

  await booking.open();

  await expect(page.getByRole('button', { name: 'Elegir Limpieza dental' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elegir Blanqueamiento' })).toHaveCount(0);
});

test('E2E 01 - reservar desde el catálogo: el servicio llega ya elegido', async ({ page }) => {
  await loginAs(page, 'paciente1');
  const booking = new ReservaPage(page);

  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Servicios' })
    .click();
  await page.getByRole('link', { name: 'Reservar Limpieza dental' }).click();
  await expect(page.getByText('Servicio: Limpieza dental')).toBeVisible();
  await booking.chooseDentist('Dra. Laura Gómez');
  await booking.chooseDate(TOMORROW);
  await booking.chooseSlot('09:00');
  await booking.confirm();

  await expect(page).toHaveURL(/\/mis-citas$/);
  const appointments = new MisCitasPage(page).rows();
  await expect(appointments).toHaveCount(1);
  await expect(appointments.first()).toContainText('Limpieza dental');
  await expect(appointments.first()).toContainText('09:00 - 09:30');
});
