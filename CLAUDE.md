# cita-dental — Sistema de Citas para Clínica Dental

Backend NestJS + Prisma + PostgreSQL (Docker), con TDD. Frontend React + Vite y E2E con Playwright en avances posteriores.
La especificación del avance actual está en [docs/PROMPT_CLAUDE_CODE.md](docs/PROMPT_CLAUDE_CODE.md); léela antes de implementar.

## Skills del proyecto

Este repo trae sus propias skills en `.claude/` (copias versionadas, no enlaces):

```
.claude/skills/      → agent-skills (addyosmani) + graphify
.claude/commands/    → /spec /planning /build /test /review /code-simplify /constraints /ship /webperf
.claude/agents/      → code-reviewer, test-engineer, security-auditor, web-performance-auditor
.claude/references/  → checklists compartidos (definition-of-done, testing, security, performance, a11y…)
```

Si una tarea encaja con una skill, invócala antes de empezar. No la saltes porque la tarea "parece pequeña".

### graphify — entender el código antes de tocarlo

- Si existe `graphify-out/graph.json`, cualquier pregunta sobre arquitectura o relaciones entre archivos se responde **primero** con `graphify query "<pregunta>"`, no leyendo archivos a ciegas.
- Construir el grafo: `/graphify .` (primera vez) y `/graphify . --update` después de cambios grandes (añadir un módulo, migraciones nuevas).
- Útiles: `/graphify path "AuthModule" "PrismaService"`, `/graphify explain "RolesGuard"`.
- `graphify-out/` es artefacto generado: no editarlo a mano.

### agent-skills — flujo de trabajo

Ciclo por funcionalidad (cada módulo: auth, users, dentists, services, availability, appointments):

| Fase | Comando / skill | Cuándo |
|---|---|---|
| Definir | `/spec` (spec-driven-development), `interview-me` | Requisito ambiguo o módulo nuevo sin especificación |
| Planificar | `/planning` (planning-and-task-breakdown) | Hay spec; partirla en tareas con criterios de aceptación |
| Construir | `/build` (incremental-implementation + test-driven-development) | Una tarea a la vez; `/build auto` para todo el plan |
| Probar | `/test` | Toda lógica nueva y todo bug (patrón Prove-It: test rojo primero) |
| Revisar | `/review`, `/code-simplify` | Antes de dar por cerrada una tarea |
| Entregar | `/ship` | Antes de una demo o despliegue |

Skills que aplican especialmente a este proyecto:

- **test-driven-development** — obligatorio. RED → GREEN → REFACTOR. Nombres de tests en español; `--verbose` en Jest.
- **api-and-interface-design** — al diseñar endpoints REST y DTOs.
- **security-and-hardening** — auth, JWT, hashing con bcrypt, guards por rol, validación con `whitelist: true`.
- **debugging-and-error-recovery** — cuando un test o la BD fallan; buscar la causa raíz, no parchear.
- **source-driven-development** — verificar APIs de NestJS/Prisma contra la documentación oficial.
- **frontend-ui-engineering** y **browser-testing-with-devtools** — solo cuando empiece el frontend.
- **git-workflow-and-versioning** — commits atómicos por tarea.

Agentes (subagentes) para revisiones a fondo: `code-reviewer`, `test-engineer`, `security-auditor`.

## Comandos

```bash
docker compose up -d                 # PostgreSQL
npx prisma migrate dev               # migraciones
npm run seed                         # datos iniciales
npm run start:dev                    # API en modo desarrollo
npm run test -- --verbose            # unitarios
npm run test:int -- --verbose        # integración (BD de test)
npm run test:all                     # ambos
```

## Reglas

- Arquitectura por módulo: controller (HTTP) → service (reglas de negocio) → PrismaService. Las reglas puras de dominio (solapamientos, máquina de estados, cálculo de horarios) van en funciones/clases sin dependencias.
- Ningún código de producción sin un test que falle antes.
- No marcar una tarea como hecha sin los tests en verde (ver `.claude/references/definition-of-done.md`).
- No implementar módulos fuera del avance actual definido en `docs/`.
- No commitear `.env` ni secretos.
