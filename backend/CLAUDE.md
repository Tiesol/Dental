# Backend — Sistema de Citas para Clínica Dental

Proyecto final de Taller de Actualización V. API REST en **NestJS + TypeScript + PostgreSQL + Prisma**, auth **JWT con Passport**, tests con **Jest + Supertest**.

Antes de escribir código lee, en este orden:

1. `ARQUITECTURA.md` — capas, estructura de carpetas, modelo de datos, estrategia de concurrencia, estados de la cita, seguridad.
2. `CONVENCIONES.md` — idioma, nombres, errores, Prisma, tests, git.
3. Skill `reglas-de-negocio-citas` — las reglas del PDF del docente, que son el criterio de evaluación.

Skills en `.claude/skills/`: `reglas-de-negocio-citas` (fuente de verdad), `ciclo-tdd` (RED/GREEN/REFACTOR, bugs, Definition of Done), `crear-modulo-nest`, `test-unitario-reglas`, `test-integracion-api`, `prisma-migraciones`.
Agentes en `.claude/agents/`: `revisor-reglas-negocio`, `revisor-tests-backend`, `auditor-seguridad-roles`, `revisor-codigo`.

Reglas no negociables:

- La lógica de negocio va en `domain/`, sin Nest ni Prisma, y siempre con tests unitarios escritos antes que el código.
- Toda reserva o reprogramación corre dentro de una transacción con bloqueo del odontólogo.
- Ninguna ruta privada sin guard de JWT, rol y verificación de propiedad.
- No se marca una tarea como terminada sin `npm run lint`, `npm run test` y `npm run test:int` en verde y sin la Definition of Done del skill `ciclo-tdd`.
