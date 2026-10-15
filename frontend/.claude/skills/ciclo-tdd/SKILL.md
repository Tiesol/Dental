---
name: ciclo-tdd
description: Ciclo de trabajo del frontend con TDD (RED, GREEN, REFACTOR), patrón "pruébalo primero" para bugs, qué hacer cuando algo falla y la Definition of Done del proyecto. Usar al implementar cualquier componente, hook o flujo, corregir cualquier bug o antes de dar una tarea por terminada.
---

# Ciclo TDD y Definition of Done (frontend)

Adaptado de la librería agent-skills (test-driven-development, debugging-and-error-recovery, definition-of-done) a este proyecto. El docente evalúa que existan tests unitarios con asserts correctos y que los E2E recorran la interfaz real.

## 1. El ciclo

```
   RED                   GREEN                 REFACTOR
 escribir un test   →  mínimo código     →   limpiar sin cambiar
 que FALLA             para que PASE         comportamiento (tests siguen verdes)
```

1. **RED**: escribe el test del comportamiento (skill `test-componente`; para flujos completos del PDF, `e2e-playwright`) y ejecútalo. Debe fallar.
2. **GREEN**: escribe lo mínimo para que pase.
3. **REFACTOR**: extrae componentes, mueve lógica a hooks o a `shared/lib`, mejora nombres. Vuelve a correr los tests.
4. Repite.

Comandos del repo (no asumir otros): `npm run test` (Vitest), `npx vitest run ruta/al/archivo.test.tsx` (enfocado), `npm run test:e2e` (Playwright), `npm run lint && npm run build`.

Commits: `test(reserva): RED - ...`, `feat(reserva): GREEN - ...`, `refactor(reserva): ...`. Nunca un commit con tests en rojo salvo que su mensaje diga RED.

## 2. Bugs: pruébalo primero

1. Escribe un test (componente o E2E) que reproduzca el bug. Debe fallar.
2. Confirma que falla por la razón correcta.
3. Corrige.
4. El test pasa. Corre `npm run lint && npm run build` y la suite.

## 3. Cuando algo falla

Regla de "parar la línea": no seguir con la siguiente pantalla mientras algo esté roto.

1. **Reproducir** en el navegador real: ruta, rol, datos. Capturar consola y pestaña Network (status, cuerpo de la respuesta).
2. **Preservar evidencia**: error textual completo, no un resumen.
3. **Diagnosticar**: ¿es HTML/CSS, estado de React, la llamada a la API o el backend? Un 4xx/5xx del backend se corrige en el backend, no ocultándolo en la UI.
4. **Corregir la causa**, no el síntoma (nada de `// eslint-disable`, `as any`, `test.skip`, `setTimeout` para "esperar" al estado).
5. **Proteger** con un test.

Casos típicos: `VITE_API_URL` sin el prefijo `/api/v1`; token vencido (`/auth/me` devuelve 401 y `AuthProvider` cierra sesión); CORS cuando el backend no tiene `FRONTEND_URL` correcto.

## 4. Qué se prueba y cómo

- Nivel más bajo que capture el comportamiento: utilidades puras y `estados-cita.ts` con Vitest sin render; componentes con RTL + MSW; solo los 7 escenarios del PDF como E2E.
- Mockear solo en el borde: la red, con MSW. Nunca hooks de la feature ni `fetch` a mano.
- Consultar por rol y nombre accesible (`getByRole('button', { name: 'Cancelar' })`); `data-testid` solo para badge, slots y mensajes de error.
- Interacciones con `@testing-library/user-event`; esperas con `findBy*` / `await expect(...)`, nunca `setTimeout` ni `waitForTimeout`.
- DAMP antes que DRY: cada `it` se entiende solo. Factories (`citaDePrueba`, `odontologoDePrueba`) para datos, no para esconder el assert.
- Un `it` por comportamiento, nombre en español.
- Cubrir: camino feliz, lista vacía, error de la API (409, 403, sin conexión), estado de carga, cada estado de cita por rol.

## 5. Antipatrones que el docente penaliza

| Antipatrón                                                                | Problema                     | Alternativa                                                                   |
| ------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `toBeTruthy()` / `toBeDefined()` como único assert                        | No detecta regresiones       | `toHaveTextContent('CANCELADA')`, `toBeDisabled()`, `not.toBeInTheDocument()` |
| Probar detalles de implementación (estado interno, nombres de clases CSS) | Rompe al refactorizar        | Probar lo que el usuario ve y hace                                            |
| E2E que actúan vía API en lugar de la UI                                  | El PDF exige "interfaz real" | Solo seed por API; acciones por pantalla                                      |
| Tests dependientes entre sí                                               | Pasan solos, fallan juntos   | Seed limpio por escenario; `resetHandlers()` en `afterEach`                   |
| Snapshot de pantallas completas                                           | Nadie revisa el diff         | Asserts concretos                                                             |
| `fireEvent` para flujos de usuario                                        | No simula el teclado real    | `userEvent`                                                                   |

## 6. Definition of Done (frontend)

**Correctitud**

- [ ] La pantalla refleja la regla del PDF (skill `reglas-de-negocio-citas`): acciones por estado y rol desde `estados-cita.ts`, textos exactos de estados, manejo de 409 y 403.
- [ ] Tests que fallan sin el cambio y pasan con él; si es un flujo del PDF, su E2E.
- [ ] Verificado en el navegador real contra el backend (no solo en tests): consola sin errores.

**Calidad**

- [ ] `npm run lint`, `npm run format:check` y `npm run build` sin errores.
- [ ] Sin `any`, sin `console.log`, sin `eslint-disable`.
- [ ] Red solo en `src/api/`; tipos del contrato en `src/api/types.ts` sincronizados con los DTOs del backend.
- [ ] `data-testid` de la convención presentes y sin renombrar.

**Accesibilidad y UX**

- [ ] Todo control con `label` o `aria-label`; acciones como `button`; foco visible; estados de carga, vacío y error visibles en español.
- [ ] Pasada del agente `revisor-accesibilidad-ux` sin hallazgos altos.

**Documentación**

- [ ] `ARQUITECTURA.md` sección 3 y 4 actualizadas si hubo feature o ruta nueva.
- [ ] README del frontend suficiente para que el docente levante y pruebe sin ayuda.

**Revisión**

- [ ] Agentes `revisor-flujos-ui` y `revisor-tests-frontend` sin bloqueantes.
- [ ] Una persona del equipo revisó antes de mezclar a `main`.

## 7. Señales de alarma

- "Se ve bien en mi máquina" sin test ni verificación en navegador.
- Tests que pasan a la primera sin haber visto el RED.
- Mutaciones (reservar, cancelar, reprogramar) que no refrescan slots ni listas.
- Un listón distinto según la fecha de entrega.
