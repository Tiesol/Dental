---
name: ciclo-tdd
description: Ciclo de trabajo del backend con TDD (RED, GREEN, REFACTOR), patrón "pruébalo primero" para bugs, qué hacer cuando algo falla y la Definition of Done del proyecto. Usar al implementar cualquier lógica, corregir cualquier bug o antes de dar una tarea por terminada.
---

# Ciclo TDD y Definition of Done (backend)

Adaptado de la librería agent-skills (test-driven-development, debugging-and-error-recovery, definition-of-done) a este proyecto. El docente evalúa que los tests protejan reglas reales y que toda la suite pueda volver a ejecutarse: el ciclo de abajo es la forma de garantizarlo.

## 1. El ciclo

```
   RED                   GREEN                 REFACTOR
 escribir un test   →  mínimo código     →   limpiar sin cambiar
 que FALLA             para que PASE         comportamiento (tests siguen verdes)
```

1. **RED**: escribe el test de la regla (skill `test-unitario-reglas` o `test-integracion-api`) y ejecútalo. Debe fallar. Un test que pasa a la primera no prueba nada.
2. **GREEN**: escribe lo mínimo para que pase. Sin anticipar casos que aún no tienen test.
3. **REFACTOR**: extrae funciones de dominio, mejora nombres, elimina duplicación. Vuelve a correr los tests tras cada paso.
4. Repite con la siguiente regla.

Comandos del repo (no asumir otros): test enfocado `npx jest ruta/al/archivo.spec.ts`; unitarios `npm run test`; integración `npm run test:int`; todo `npm run test:all`.

Commits: cada paso del ciclo puede ser un commit (`test(auth): RED - ...`, `feat(auth): GREEN - ...`, `refactor(auth): ...`), como viene haciendo el equipo. Nunca un commit con tests en rojo salvo que su mensaje diga RED.

## 2. Bugs: pruébalo primero

Ante un bug **no se empieza por arreglarlo**:

1. Escribe un test que reproduzca el bug. Debe fallar.
2. Confirma que falla por la razón correcta.
3. Corrige.
4. El test pasa. Corre la suite completa.

El test queda como guardia contra regresiones.

## 3. Cuando algo falla (tests, build, BD)

Regla de "parar la línea": no seguir con la siguiente tarea mientras algo esté roto.

1. **Reproducir** de forma fiable (mismo comando, mismo dato).
2. **Preservar evidencia**: salida completa del error, no un resumen.
3. **Diagnosticar** la causa raíz: ¿cambió el código, el schema, la configuración, el entorno? Leer el stack trace completo antes de tocar nada.
4. **Corregir la causa**, no el síntoma (nada de `test.skip`, `--force`, bajar umbrales de cobertura o envolver en `try/catch` vacío).
5. **Proteger** con un test si el fallo era de lógica.

Casos típicos aquí: BD de test sin migrar (`npm run prisma:migrate:test`), contenedor apagado (`docker compose up -d`), cliente Prisma desactualizado (`npx prisma generate`), `@nestjs/*` fuera de la línea 11.

## 4. Qué se prueba y cómo

- Preferir, en este orden: implementación real → fake en memoria → stub → mock. Mockear solo en los bordes (repositories, JwtService, reloj, bcrypt). Nunca mockear funciones de dominio.
- Probar **estado y resultado**, no la secuencia interna de llamadas. Excepción: afirmar que ante un error de dominio **no** se persistió nada (`expect(repo.create).not.toHaveBeenCalled()`).
- DAMP antes que DRY en tests: cada `it` se entiende solo, aunque repita datos. Los helpers son para crear datos (factories y builders), no para esconder el assert.
- Un `it` por concepto; nombre en español que se lea como una especificación.
- Cubrir siempre: camino feliz, entrada vacía o nula, límites (duración 0, cita exactamente consecutiva, fecha igual a "ahora"), caminos de error, concurrencia (dos reservas simultáneas).

## 5. Antipatrones que el docente penaliza

| Antipatrón | Problema | Alternativa |
|---|---|---|
| Probar métodos triviales (getters, `toBe(true)` sobre constantes) | No protege reglas | Probar las 9 reglas de la sección 12 del PDF |
| `toBeTruthy()` / `toBeDefined()` como único assert | No detecta regresiones | Assert específico: valor, clase de error, status exacto |
| Tests que dependen del orden o de datos de otro test | Fallan juntos, pasan solos | `resetDb()` en `beforeEach`, factories por test |
| `new Date()` sin control | Flaky | `Clock` inyectado o `jest.useFakeTimers()` |
| Mockear Prisma en integración | No prueba persistencia | BD real de test |
| `test.skip` o tests comentados para que pase CI | Oculta bugs | Corregir o borrar |
| Snapshot de respuestas completas | Nadie revisa el diff | Asserts sobre campos concretos |

## 6. Definition of Done (backend)

Una tarea está terminada solo si cumple **todo** esto. Es el mismo listón siempre, sin importar la prisa.

**Correctitud**
- [ ] Cumple la regla del PDF tal como está en el skill `reglas-de-negocio-citas`.
- [ ] Hay tests que fallan sin el cambio y pasan con él (unitario para dominio/service; integración para endpoint).
- [ ] `npm run test:all` en verde; ninguna regresión.
- [ ] Casos negativos y de borde cubiertos, no solo el camino feliz.

**Calidad**
- [ ] `npm run lint` y `npm run format:check` sin errores.
- [ ] Sin `any`, sin `console.log`, sin código muerto ni comentado.
- [ ] Lógica de negocio en `domain/`; nada de reglas en controllers; solo repositories importan Prisma.
- [ ] El cambio está acotado a la tarea (sin refactors ajenos mezclados).

**Integración**
- [ ] Si tocó el schema: migración versionada, `seed.ts` y factories actualizados, BD de test migrada.
- [ ] Si tocó un endpoint: `ARQUITECTURA.md` sección 8 y Swagger (`@ApiProperty`, `@ApiOperation`) actualizados.
- [ ] Si tocó auth o roles: test 401 y 403 del endpoint y pasada del agente `auditor-seguridad-roles`.

**Documentación**
- [ ] `README.md` sigue siendo suficiente para que el docente levante y pruebe el proyecto sin ayuda.
- [ ] Decisiones nuevas registradas en la sección "Decisiones" del README raíz.

**Revisión**
- [ ] Agentes `revisor-reglas-negocio` y `revisor-tests-backend` sin bloqueantes.
- [ ] Una persona del equipo revisó antes de mezclar a `main`.

## 7. Señales de alarma

- "Funciona, solo falta correr los tests": no está hecho.
- Tests que pasan a la primera sin haber visto el RED.
- Ejecutar el mismo comando de test dos veces seguidas sin cambiar código "para estar seguro".
- Un listón distinto según la fecha de entrega.
