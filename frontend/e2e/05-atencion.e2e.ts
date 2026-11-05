import { loginComo } from './fixtures/auth';
import { expect, test } from './fixtures/seed';
import { AgendaPage } from './pages/AgendaPage';

test('E2E 05 - atención: el odontólogo inicia, registra la observación y finaliza', async ({
  page,
  seed,
}) => {
  const cita = await seed.cita({
    paciente: 'paciente1',
    horaInicio: '2026-11-09T13:00:00.000Z',
    estado: 'CONFIRMADA',
  });
  await loginComo(page, 'odontologo');
  const agenda = new AgendaPage(page);

  await agenda.abrir();
  await expect(agenda.fila(cita.id)).toContainText('Ana Pérez');
  await agenda.abrirCita(cita.id);
  await agenda.iniciarAtencion();
  await expect(agenda.estado()).toHaveText('EN ATENCIÓN');
  await expect(page.getByTestId('btn-finalizar')).toBeDisabled();
  await agenda.registrarObservacion('Limpieza sin complicaciones');
  await expect(page.getByTestId('observacion-cita')).toHaveText('Limpieza sin complicaciones');
  await agenda.finalizar();

  await expect(agenda.estado()).toHaveText('FINALIZADA');
  await expect(page.getByTestId('observacion-cita')).toHaveText('Limpieza sin complicaciones');
  await expect(page.getByTestId('btn-finalizar')).toHaveCount(0);
});

test('E2E 05 - un paciente no puede entrar a la agenda', async ({ page }) => {
  await loginComo(page, 'paciente1');

  await page.goto('/agenda');

  await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toHaveCount(0);
});
