import { loginAs } from './fixtures/auth';
import { expect, test } from './fixtures/seed';
import { DetalleCitaPage } from './pages/DetalleCitaPage';
import { MisCitasPage } from './pages/MisCitasPage';

test('E2E 06 - historial: el paciente abre una cita finalizada y ve sus datos', async ({
  page,
  seed,
}) => {
  const appointment = await seed.appointment({
    paciente: 'paciente1',
    horaInicio: '2026-11-02T13:00:00.000Z',
    estado: 'FINALIZADA',
    observacion: 'Limpieza sin complicaciones',
  });
  await loginAs(page, 'paciente1');
  const myAppointments = new MisCitasPage(page);
  const detail = new DetalleCitaPage(page);

  await myAppointments.open();
  await expect(page.getByText('No tienes citas próximas')).toBeVisible();
  await expect(myAppointments.row(appointment.id)).toHaveCount(0);
  await myAppointments.viewHistory();
  await expect(myAppointments.row(appointment.id).getByTestId('estado-cita')).toHaveText(
    'FINALIZADA',
  );
  await myAppointments.openAppointment(appointment.id);

  await expect(detail.data()).toContainText('Limpieza dental');
  await expect(detail.data()).toContainText('Dra. Laura Gómez');
  await expect(detail.data()).toContainText('lunes, 2 de noviembre de 2026');
  await expect(detail.data()).toContainText('09:00 - 09:30');
  await expect(detail.data()).toContainText('Limpieza sin complicaciones');
  await expect(detail.status()).toHaveText('FINALIZADA');
  await expect(page.getByTestId('btn-reprogramar')).toHaveCount(0);
  await expect(page.getByTestId('btn-cancelar')).toHaveCount(0);
});
