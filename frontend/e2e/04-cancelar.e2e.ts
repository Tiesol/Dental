import { loginComo } from './fixtures/auth';
import { MANIANA } from './fixtures/entorno';
import { expect, test } from './fixtures/seed';
import { DetalleCitaPage } from './pages/DetalleCitaPage';
import { MisCitasPage } from './pages/MisCitasPage';
import { ReservaPage } from './pages/ReservaPage';

test('E2E 04 - cancelar: queda CANCELADA y el horario vuelve a estar disponible', async ({
  page,
  seed,
}) => {
  const cita = await seed.cita({
    paciente: 'paciente1',
    horaInicio: '2026-11-10T13:00:00.000Z',
  });
  await loginComo(page, 'paciente1');
  const reserva = new ReservaPage(page);
  await reserva.hastaLosHorarios('Limpieza dental', 'Dra. Laura Gómez', MANIANA);
  await expect(reserva.slot('09:30')).toBeVisible();
  await expect(reserva.slot('09:00')).toHaveCount(0);
  const misCitas = new MisCitasPage(page);
  const detalle = new DetalleCitaPage(page);

  await misCitas.abrir();
  await misCitas.abrirCita(cita.id);
  await detalle.cancelar();

  await expect(detalle.estado()).toHaveText('CANCELADA');
  await expect(page.getByTestId('btn-cancelar')).toHaveCount(0);
  await reserva.hastaLosHorarios('Limpieza dental', 'Dra. Laura Gómez', MANIANA);
  await expect(reserva.slot('09:00')).toBeVisible();
});
