---
name: test-componente
description: Escribir tests unitarios y de componentes con Vitest, React Testing Library y MSW para el frontend del sistema de citas. Usar al crear o modificar componentes, hooks, páginas o utilidades (fechas, acciones permitidas por estado y rol, formularios).
---

# Tests unitarios y de componentes

El docente evalúa "existen test unitarios", "asserts utilizados correctamente", "casos positivos y negativos", "mocks/stubs cuando corresponde" y "test de estados". En el frontend eso se cumple con Vitest + RTL + MSW.

## Qué se prueba y dónde

| Tipo             | Ejemplos                                                                                                                                                                                                            | Herramienta        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Utilidades puras | `dates.ts` (conversión UTC a zona de clínica, formato de slot), `estados-cita.ts` (acciones permitidas por estado y rol, etiqueta de cada estado)                                                                   | Vitest, sin render |
| Hooks            | `useAuth` (carga de sesión, logout ante 401)                                                                                                                                                                        | `renderHook` + MSW |
| Componentes      | `EstadoCitaBadge` muestra el texto exacto; `DetalleCita` oculta Cancelar en FINALIZADA; `PasoOdontologo` lista solo odontólogos que realizan el servicio; `PasoFechaHora` muestra mensaje y refresca slots ante 409 | RTL + MSW          |
| Páginas          | `MisCitasPage` separa próximas e historial; `AgendaPage` ordena por fecha y hora                                                                                                                                    | RTL + MSW          |

## Infraestructura

- `src/test/setup.ts`: `@testing-library/jest-dom`, `cleanup`, arranque de MSW (`server.listen()` en `beforeAll`, `resetHandlers()` en `afterEach`, `close()` en `afterAll`).
- `src/test/msw/handlers.ts`: handlers por endpoint con datos de ejemplo. Cada test puede sobreescribir un handler con `server.use(...)` para simular 409, 403 o lista vacía.
- `src/test/utils.tsx`: `renderWithProviders(ui, { user?: { role } , route? })` que envuelve con QueryClient (sin reintentos), AuthContext y Router.
- Factories: `citaDePrueba({ estado: 'FINALIZADA' })`, `servicioDePrueba()`, `odontologoDePrueba({ servicios })`.
- Reloj: `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))` cuando el componente depende del "ahora".

## Patrón

```tsx
it('oculta el botón Cancelar cuando la cita está FINALIZADA', async () => {
  // Arrange
  server.use(
    http.get('*/appointments/:id', () => HttpResponse.json(citaDePrueba({ estado: 'FINALIZADA' }))),
  );

  // Act
  renderWithProviders(<DetalleCitaPage />, { user: { role: 'PACIENTE' }, route: '/mis-citas/1' });

  // Assert
  expect(await screen.findByTestId('estado-cita')).toHaveTextContent('FINALIZADA');
  expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
});
```

## Reglas del skill

1. AAA con líneas en blanco. Un `it` por comportamiento, nombre en español.
2. Para `estados-cita.ts`: `it.each` sobre la tabla completa estado por rol de `ARQUITECTURA.md` sección 7, casos positivos (acción visible) y negativos (acción ausente).
3. Consultar por rol y nombre accesible primero; `data-testid` solo para badge, slots y mensajes de error.
4. Asserts específicos: `toHaveTextContent('CANCELADA')`, `toBeDisabled()`, `not.toBeInTheDocument()`. Prohibido `toBeTruthy()` como único assert.
5. Nunca mockear hooks de la feature ni `fetch` a mano: la API se simula con MSW para que el test cubra también `src/api/`.
6. Interacciones con `@testing-library/user-event`, no `fireEvent`.
7. Verificar invalidación: tras una mutación exitosa, el handler de slots debe ser llamado de nuevo (contar llamadas con un `vi.fn()` dentro del handler).
8. Comando: `npm run test`. Cobertura objetivo: 90% en `shared/lib/` y en `features/*/hooks/`.
