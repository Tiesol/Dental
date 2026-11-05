import { loginComo } from './fixtures/auth';
import { expect, test } from './fixtures/seed';
import { DetalleCitaPage } from './pages/DetalleCitaPage';
import { MisCitasPage } from './pages/MisCitasPage';

const LAS_NUEVE = '2026-11-10T13:00:00.000Z';

test('E2E 03 - reprogramar: cambia el horario y libera el anterior', async ({ page, seed }) => {
  const cita = await seed.cita({ paciente: 'paciente1', horaInicio: LAS_NUEVE });
  await loginComo(page, 'paciente1');
  const misCitas = new MisCitasPage(page);
  const detalle = new DetalleCitaPage(page);

  await misCitas.abrir();
  await misCitas.abrirCita(cita.id);
  await expect(detalle.datos()).toContainText('09:00 - 09:30');
  await detalle.reprogramarA('10:00');

  await expect(detalle.datos()).toContainText('10:00 - 10:30');
  await expect(detalle.estado()).toHaveText('PENDIENTE');
  await page.getByTestId('btn-reprogramar').click();
  await expect(detalle.slot('09:00')).toBeVisible();
  await expect(detalle.slot('10:00')).toHaveCount(0);
});

test('E2E 03 - si el horario nuevo se ocupa, la cita conserva el suyo', async ({ page, seed }) => {
  const cita = await seed.cita({ paciente: 'paciente1', horaInicio: LAS_NUEVE });
  await loginComo(page, 'paciente1');
  const misCitas = new MisCitasPage(page);
  const detalle = new DetalleCitaPage(page);
  await misCitas.abrir();
  await misCitas.abrirCita(cita.id);
  await page.getByTestId('btn-reprogramar').click();
  await detalle.slot('10:00').click();

  await seed.cita({ paciente: 'paciente2', horaInicio: '2026-11-10T14:00:00.000Z' });
  await page.getByTestId('btn-confirmar-reprogramacion').click();

  await expect(page.getByTestId('error-mensaje')).toHaveText('El horario ya no está disponible');
  await expect(detalle.datos()).toContainText('09:00 - 09:30');
  await expect(detalle.slot('10:00')).toHaveCount(0);
});
