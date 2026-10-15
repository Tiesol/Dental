# Frontend — Sistema de Citas para Clínica Dental

Proyecto final de Taller de Actualización V. SPA en **React + Vite + TypeScript**, tests con **Vitest + React Testing Library + MSW**, E2E con **Playwright**. Consume la API REST del backend NestJS (`../backend`) con JWT.

Antes de escribir código lee, en este orden:

1. `ARQUITECTURA.md` — capas, estructura por features, rutas y roles, auth en cliente, caché de datos, estados de la cita en la UI, estrategia de testing.
2. `CONVENCIONES.md` — idioma, nombres, React, estilos, tests, `data-testid`, git.
3. Skill `reglas-de-negocio-citas` — qué debe reflejar la interfaz según el PDF del docente.

Skills en `.claude/skills/`: `reglas-de-negocio-citas`, `ciclo-tdd` (RED/GREEN/REFACTOR, bugs, Definition of Done), `crear-feature`, `consumo-api`, `test-componente`, `e2e-playwright`.
Agentes en `.claude/agents/`: `revisor-flujos-ui`, `revisor-tests-frontend`, `revisor-accesibilidad-ux`, `revisor-codigo`.

Reglas no negociables:

- Ninguna llamada a la red fuera de `src/api/`.
- Las acciones visibles por estado y rol salen de `shared/lib/estados-cita.ts`, nunca de `if` sueltos en componentes.
- Los `data-testid` listados en `CONVENCIONES.md` sección 4 no se renombran sin actualizar los E2E.
- No se marca una tarea como terminada sin `npm run lint`, `npm run test` y `npm run build` en verde; si tocó un flujo del PDF, también `npm run test:e2e`. Y sin la Definition of Done del skill `ciclo-tdd`.
