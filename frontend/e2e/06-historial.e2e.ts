import { loginComo } from './fixtures/auth';
import { expect, test } from './fixtures/seed';
import { DetalleCitaPage } from './pages/DetalleCitaPage';
import { MisCitasPage } from './pages/MisCitasPage';

test('E2E 06 - historial: el paciente abre una cita finalizada y ve sus datos', async ({
  page,
  seed,
}) => {
  const cita = await seed.cita({
    paciente: 'paciente1',
    horaInicio: '2026-11-02T13:00:00.000Z',
    estado: 'FINALIZADA',
    observacion: 'Limpieza sin complicaciones',
  });
  await loginComo(page, 'paciente1');
  const misCitas = new MisCitasPage(page);
  const detalle = new DetalleCitaPage(page);

  await misCitas.abrir();
  await expect(page.getByText('No tienes citas próximas')).toBeVisible();
  await expect(misCitas.fila(cita.id)).toHaveCount(0);
  await misCitas.verHistorial();
  await expect(misCitas.fila(cita.id).getByTestId('estado-cita')).toHaveText('FINALIZADA');
  await misCitas.abrirCita(cita.id);

  await expect(detalle.datos()).toContainText('Limpieza dental');
  await expect(detalle.datos()).toContainText('Dra. Laura Gómez');
  await expect(detalle.datos()).toContainText('lunes, 2 de noviembre de 2026');
  await expect(detalle.datos()).toContainText('09:00 - 09:30');
  await expect(detalle.datos()).toContainText('Limpieza sin complicaciones');
  await expect(detalle.estado()).toHaveText('FINALIZADA');
  await expect(page.getByTestId('btn-reprogramar')).toHaveCount(0);
  await expect(page.getByTestId('btn-cancelar')).toHaveCount(0);
});
