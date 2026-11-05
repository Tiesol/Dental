import { loginComo } from './fixtures/auth';
import { MANIANA } from './fixtures/entorno';
import { expect, test } from './fixtures/seed';
import { MisCitasPage } from './pages/MisCitasPage';
import { ReservaPage } from './pages/ReservaPage';

test('E2E 01 - reservar cita: el paciente la ve en Mis citas', async ({ page }) => {
  await loginComo(page, 'paciente1');
  const reserva = new ReservaPage(page);

  await reserva.abrir();
  await reserva.elegirServicio('Limpieza dental');
  await reserva.elegirOdontologo('Dra. Laura Gómez');
  await reserva.elegirFecha(MANIANA);
  await reserva.elegirSlot('09:00');
  await expect(page.getByTestId('resumen-reserva')).toContainText('09:00 - 09:30');
  await reserva.confirmar();

  await expect(page).toHaveURL(/\/mis-citas$/);
  const citas = new MisCitasPage(page).filas();
  await expect(citas).toHaveCount(1);
  await expect(citas.first()).toContainText('Limpieza dental');
  await expect(citas.first()).toContainText('Dra. Laura Gómez');
  await expect(citas.first()).toContainText('martes, 10 de noviembre de 2026');
  await expect(citas.first()).toContainText('09:00 - 09:30');
  await expect(citas.first().getByTestId('estado-cita')).toHaveText('PENDIENTE');
});

test('E2E 01 - el catálogo no ofrece un servicio deshabilitado', async ({ page }) => {
  await loginComo(page, 'paciente1');
  const reserva = new ReservaPage(page);

  await reserva.abrir();

  await expect(page.getByRole('button', { name: 'Elegir Limpieza dental' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elegir Blanqueamiento' })).toHaveCount(0);
});
