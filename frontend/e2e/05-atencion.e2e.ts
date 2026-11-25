import { loginAs } from './fixtures/auth';
import { expect, test } from './fixtures/seed';
import { AgendaPage } from './pages/AgendaPage';

test('E2E 05 - atención: el odontólogo inicia, registra la observación y finaliza', async ({
  page,
  seed,
}) => {
  const appointment = await seed.appointment({
    paciente: 'paciente1',
    horaInicio: '2026-11-09T13:00:00.000Z',
    estado: 'CONFIRMADA',
  });
  await loginAs(page, 'odontologo');
  const agenda = new AgendaPage(page);

  await agenda.open();
  await expect(agenda.row(appointment.id)).toContainText('Ana Pérez');
  await agenda.openAppointment(appointment.id);
  await agenda.startCare();
  await expect(agenda.status()).toHaveText('EN ATENCIÓN');
  await expect(page.getByTestId('btn-finalizar')).toBeDisabled();
  await agenda.registerObservation('Limpieza sin complicaciones');
  await expect(page.getByTestId('observacion-cita')).toHaveText('Limpieza sin complicaciones');
  await agenda.finish();

  await expect(agenda.status()).toHaveText('FINALIZADA');
  await expect(page.getByTestId('observacion-cita')).toHaveText('Limpieza sin complicaciones');
  await expect(page.getByTestId('btn-finalizar')).toHaveCount(0);
});

test('E2E 05 - un paciente no puede entrar a la agenda', async ({ page }) => {
  await loginAs(page, 'paciente1');

  await page.goto('/agenda');

  await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toHaveCount(0);
});
