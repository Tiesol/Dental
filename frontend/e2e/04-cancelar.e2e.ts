import { loginAs } from './fixtures/auth';
import { TOMORROW } from './fixtures/environment';
import { expect, test } from './fixtures/seed';
import { DetalleCitaPage } from './pages/DetalleCitaPage';
import { MisCitasPage } from './pages/MisCitasPage';
import { ReservaPage } from './pages/ReservaPage';

test('E2E 04 - cancelar: queda CANCELADA y el horario vuelve a estar disponible', async ({
  page,
  seed,
}) => {
  const appointment = await seed.appointment({
    paciente: 'paciente1',
    horaInicio: '2026-11-10T13:00:00.000Z',
  });
  await loginAs(page, 'paciente1');
  const booking = new ReservaPage(page);
  await booking.upToSlots('Limpieza dental', 'Dra. Laura Gómez', TOMORROW);
  await expect(booking.slot('09:30')).toBeVisible();
  await expect(booking.slot('09:00')).toHaveCount(0);
  const myAppointments = new MisCitasPage(page);
  const detail = new DetalleCitaPage(page);

  await myAppointments.open();
  await myAppointments.openAppointment(appointment.id);
  await detail.cancel();

  await expect(detail.status()).toHaveText('CANCELADA');
  await expect(page.getByTestId('btn-cancelar')).toHaveCount(0);
  await booking.upToSlots('Limpieza dental', 'Dra. Laura Gómez', TOMORROW);
  await expect(booking.slot('09:00')).toBeVisible();
});
