# citas-dentales — Sistema de Citas para Clínica Dental

Proyecto final de Taller de Actualización V. Monolito: `backend/` (NestJS 11 + Prisma 6 + PostgreSQL 16 en Docker) y `frontend/` (React 19 + Vite + TypeScript). El requerimiento es el PDF del docente; las reglas extraídas de él están en el skill `reglas-de-negocio-citas` de cada carpeta.

## Qué leer antes de tocar código

- Backend: `backend/CLAUDE.md` → `backend/ARQUITECTURA.md` → `backend/CONVENCIONES.md`.
- Frontend: `frontend/CLAUDE.md` → `frontend/ARQUITECTURA.md` → `frontend/CONVENCIONES.md`.
- Decisiones y pendientes del proyecto: `README.md` (sección "Decisiones").

## Arquitectura (resumen)

- Backend: un módulo Nest por agregado en `src/modules/`, con capas **controller → service → domain → repository**. Las reglas puras (solapamiento, máquina de estados, cálculo de horarios) van en `domain/` sin dependencias de Nest ni Prisma y siempre con tests unitarios. Solo los `*.repository.ts` importan Prisma. Los services lanzan únicamente `DomainError` (en `src/common/errors`), que un filtro global traduce a HTTP.
- Frontend: organización por features en `src/features/`, red solo en `src/api/`, alias `@/` → `src/`.
- Seguridad: `JwtAuthGuard` y `RolesGuard` globales; `@Public()` solo en register/login; verificación de propiedad en los services.

## Skills y agentes

Viven **por carpeta**, en `backend/.claude/` y `frontend/.claude/`; Claude Code los carga al trabajar dentro de cada una. No hay skills en la raíz.

| Carpeta  | Skills                                                                                                                            | Agentes                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| backend  | `reglas-de-negocio-citas`, `ciclo-tdd`, `crear-modulo-nest`, `test-unitario-reglas`, `test-integracion-api`, `prisma-migraciones` | `revisor-reglas-negocio`, `revisor-tests-backend`, `auditor-seguridad-roles`, `revisor-codigo` |
| frontend | `reglas-de-negocio-citas`, `ciclo-tdd`, `crear-feature`, `consumo-api`, `test-componente`, `e2e-playwright`                       | `revisor-flujos-ui`, `revisor-tests-frontend`, `revisor-accesibilidad-ux`, `revisor-codigo`    |

Flujo por funcionalidad: leer la regla en `reglas-de-negocio-citas` → `ciclo-tdd` (RED → GREEN → REFACTOR, un commit por paso) → skill de la capa que toques → agentes revisores de la carpeta → Definition of Done de `ciclo-tdd` antes de cerrar.

Verificar las APIs de NestJS, Prisma, React y Playwright contra la documentación oficial o el código de `node_modules`, no de memoria: las versiones de este repo son recientes.

## Flujo de equipo

`CONTRIBUTING.md` define ramas, commits y PRs. Los commits los valida commitlint (`commitlint.config.mjs`: tipos y ámbitos permitidos, 72 caracteres, sin punto final) en el hook `commit-msg`, y `lint-staged` corre ESLint y Prettier en `pre-commit`. Nunca usar `--no-verify`. El CI (`.github/workflows/ci.yml`) debe estar en verde antes de mezclar.

## Comandos

```bash
npm install                          # en la raíz, una vez: activa los hooks de git
docker compose up -d                 # BD dev (localhost:5434) y test (localhost:5433)
# en backend/
npx prisma migrate dev               # migraciones
npm run seed                         # admin@clinica.com / Admin12345, odontologo@clinica.com / Odontologo12345
npm run start:dev                    # API en :3000/api/v1, Swagger en /api/docs
npm run lint                         # ESLint + Prettier
npm run test -- --verbose            # unitarios
npm run test:int -- --verbose        # integración (BD de test)
npm run test:all                     # ambos
# en frontend/
npm run dev                          # :5173
npm run lint && npm run test && npm run build
npm run test:e2e                     # Playwright (chromium instalado con npx playwright install chromium)
```

- Jest 30 compacta la salida cuando detecta un agente (`AI_AGENT`); para ver cada test: `env -u AI_AGENT -u CLAUDECODE npm run test:int`.
- Prisma bloquea `migrate reset --force` lanzado por un agente: pedir confirmación al usuario antes de usarlo.
- Mantener `@nestjs/*` en la línea 11 (CommonJS); las versiones 12 son ESM y rompen Jest. `@nestjs/swagger` y `@nestjs/passport` también en 11.
- Frontend: TypeScript 6 con `erasableSyntaxOnly` (sin parameter properties ni enums en `src/`).

## Reglas

- Ningún código de producción sin un test que falle antes.
- No marcar una tarea como hecha sin lint y tests en verde ni sin la Definition of Done del skill `ciclo-tdd`.
- No implementar nada fuera del alcance del PDF (sin pagos, seguros, facturación ni inventario).
- No commitear `.env` ni secretos. Nunca `console.log` en producción.
- Valores de enums de negocio exactamente como el PDF: `PACIENTE`, `ODONTOLOGO`, `ADMIN`; `PENDIENTE`, `CONFIRMADA`, `EN_ATENCION`, `FINALIZADA`, `CANCELADA`.
