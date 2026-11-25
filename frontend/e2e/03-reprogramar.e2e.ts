import { loginAs } from './fixtures/auth';
import { expect, test } from './fixtures/seed';
import { DetalleCitaPage } from './pages/DetalleCitaPage';
import { MisCitasPage } from './pages/MisCitasPage';

const NINE_AM = '2026-11-10T13:00:00.000Z';

test('E2E 03 - reprogramar: cambia el horario y libera el anterior', async ({ page, seed }) => {
  const appointment = await seed.appointment({ paciente: 'paciente1', horaInicio: NINE_AM });
  await loginAs(page, 'paciente1');
  const myAppointments = new MisCitasPage(page);
  const detail = new DetalleCitaPage(page);

  await myAppointments.open();
  await myAppointments.openAppointment(appointment.id);
  await expect(detail.data()).toContainText('09:00 - 09:30');
  await detail.rescheduleTo('10:00');

  await expect(detail.data()).toContainText('10:00 - 10:30');
  await expect(detail.status()).toHaveText('PENDIENTE');
  await page.getByTestId('btn-reprogramar').click();
  await expect(detail.slot('09:00')).toBeVisible();
  await expect(detail.slot('10:00')).toHaveCount(0);
});

test('E2E 03 - si el horario nuevo se ocupa, la cita conserva el suyo', async ({ page, seed }) => {
  const appointment = await seed.appointment({ paciente: 'paciente1', horaInicio: NINE_AM });
  await loginAs(page, 'paciente1');
  const myAppointments = new MisCitasPage(page);
  const detail = new DetalleCitaPage(page);
  await myAppointments.open();
  await myAppointments.openAppointment(appointment.id);
  await page.getByTestId('btn-reprogramar').click();
  await detail.slot('10:00').click();

  await seed.appointment({ paciente: 'paciente2', horaInicio: '2026-11-10T14:00:00.000Z' });
  await page.getByTestId('btn-confirmar-reprogramacion').click();

  await expect(page.getByTestId('error-mensaje')).toHaveText('El horario ya no está disponible');
  await expect(detail.data()).toContainText('09:00 - 09:30');
  await expect(detail.slot('10:00')).toHaveCount(0);
});
