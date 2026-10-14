---
name: e2e-playwright
description: Escribir y mantener los tests End-to-End con Playwright que recorren la interfaz real contra el backend y la base de datos reales, cubriendo los siete escenarios E2E 01 a 07 del PDF del docente (reservar, evitar doble reserva, reprogramar, cancelar, atención, historial, control de acceso). Usar al implementar o cambiar cualquier flujo de usuario.
---

# Tests End-to-End con Playwright

El docente verifica: "Existen E2E automatizados", "Los E2E interactúan con la interfaz real", y un E2E por cada uno de reserva, doble reserva, reprogramación, cancelación, atención, control de acceso. Además, "todos los tests pueden ejecutarse nuevamente durante la evaluación": la suite debe ser repetible desde cero.

## Infraestructura

- `playwright.config.ts` con `webServer` que levanta backend (`npm run start:test` en `../backend`, apuntando a la BD de E2E) y frontend (`npm run dev`). `baseURL` del frontend. Un solo navegador (Chromium) por defecto para que la evaluación sea rápida.
- `e2e/fixtures/seed.ts`: antes de cada escenario llama al script o endpoint de seed del backend (solo habilitado con `NODE_ENV=test`) que deja: un admin, dos pacientes, un odontólogo activo con dos servicios y horario lunes a viernes 09:00-12:00, un servicio deshabilitado, y ninguna cita. Cada escenario crea las citas que necesita vía UI o vía API de seed.
- `e2e/fixtures/auth.ts`: fixture `loginComo('paciente1' | 'paciente2' | 'odontologo' | 'admin')` que hace login por la interfaz real una vez y reutiliza `storageState`.
- `e2e/pages/`: Page Objects con métodos de intención: `ReservaPage.elegirServicio('Limpieza dental')`, `elegirOdontologo(nombre)`, `elegirFecha(fecha)`, `elegirSlot('09:00')`, `confirmar()`; `MisCitasPage.abrirCita(n)`, `DetalleCitaPage.reprogramar()`, `cancelar()`, `estado()`; `AgendaPage.abrirCita(n)`, `iniciarAtencion()`, `registrarObservacion(texto)`, `finalizar()`.
- Fecha fija: los escenarios reservan siempre para el "próximo lunes" calculado desde el reloj del backend de test, que está congelado (ver backend `Clock`), para que los slots existan y no caigan en el pasado.

## Escenarios obligatorios y archivo

| Id                       | Archivo                        | Pasos y verificación                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E 01 Reservar          | `e2e/01-reservar.e2e.ts`       | login paciente1 → servicio → odontólogo → fecha/hora → confirmar → Mis citas muestra la cita con horario y estado PENDIENTE.                                                                                                                                               |
| E2E 02 Doble reserva     | `e2e/02-doble-reserva.e2e.ts`  | seed crea cita 09:00 de paciente1 → paciente2 intenta el mismo slot: el slot no aparece; además, forzando la petición (slot obtenido antes de la primera reserva), la UI muestra `error-mensaje` "El horario ya no está disponible" y no existe segunda cita en Mis citas. |
| E2E 03 Reprogramar       | `e2e/03-reprogramar.e2e.ts`    | cita existente 09:00 → detalle → Reprogramar → elegir 10:00 → confirmar → detalle muestra 10:00 → en el selector de slots del mismo día, 09:00 vuelve a estar disponible.                                                                                                  |
| E2E 04 Cancelar          | `e2e/04-cancelar.e2e.ts`       | cita existente → Cancelar → confirmar modal → badge CANCELADA → el slot reaparece en disponibilidad.                                                                                                                                                                       |
| E2E 05 Atención          | `e2e/05-atencion.e2e.ts`       | seed crea cita CONFIRMADA de hoy → login odontólogo → agenda → abrir cita → Iniciar atención → badge EN ATENCIÓN → registrar observación → Finalizar → badge FINALIZADA y observación visible.                                                                             |
| E2E 06 Historial         | `e2e/06-historial.e2e.ts`      | seed crea cita FINALIZADA con observación → login paciente1 → Mis citas → Historial → abrir → verifica servicio, odontólogo, fecha, horario, estado FINALIZADA.                                                                                                            |
| E2E 07 Control de acceso | `e2e/07-control-acceso.e2e.ts` | seed crea cita de paciente1 → login paciente2 → navegar a `/mis-citas/<id>` → se muestra "No tienes acceso a esta cita" y ningún dato de la cita; la petición a la API respondió 403 (verificar con `page.waitForResponse`).                                               |

## Patrón

```ts
test('E2E 04 - cancelar una cita libera el horario', async ({ page, seed, loginComo }) => {
  // Arrange
  const cita = await seed.citaPendiente({ paciente: 'paciente1', hora: '09:00' });
  await loginComo('paciente1');
  const detalle = await new MisCitasPage(page).abrirCita(cita.id);

  // Act
  await detalle.cancelar();

  // Assert
  await expect(page.getByTestId('estado-cita')).toHaveText('CANCELADA');
  const reserva = await new ReservaPage(page).irAlSlotDe(cita);
  await expect(page.getByTestId('slot-09:00')).toBeVisible();
});
```

## Reglas del skill

1. Un escenario por archivo, numerado como en el PDF. El `test()` lleva el id y el título del PDF.
2. Siempre por la interfaz real: nada de `page.request` para hacer acciones del usuario. La API solo se usa en el seed y para verificar códigos de respuesta.
3. Seed limpio antes de cada escenario; ningún escenario depende de otro. Debe poder ejecutarse `npm run test:e2e` dos veces seguidas con el mismo resultado.
4. Localizadores: `getByRole` y `getByTestId` con los ids de `CONVENCIONES.md` sección 4. Nunca selectores CSS de clases.
5. Asserts con auto-espera (`await expect(locator).toHaveText(...)`); prohibido `waitForTimeout`.
6. `trace: 'on-first-retry'` y `screenshot: 'only-on-failure'` para poder mostrar evidencia al docente.
7. Comandos: `npm run test:e2e` (headless), `npm run test:e2e:ui` (modo visual para la presentación).
