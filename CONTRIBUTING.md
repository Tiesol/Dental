# Cómo contribuir

Guía de trabajo del equipo para el Sistema de Citas para Clínica Dental. Las convenciones de código de cada parte están en `backend/CONVENCIONES.md` y `frontend/CONVENCIONES.md`; aquí va lo transversal: ramas, commits, pull requests y herramientas que lo hacen cumplir.

## 1. Preparar el entorno

```bash
git clone https://github.com/Tiesol/Dental.git citas-dentales
cd citas-dentales
npm install            # instala husky, commitlint y lint-staged y activa los hooks de git
```

Luego sigue el `README.md` para levantar base de datos, backend y frontend.

Los hooks quedan en `.husky/`:

- `pre-commit`: corre ESLint (con autocorrección) y Prettier **solo sobre los archivos en stage**, usando la configuración de la carpeta a la que pertenecen. Si ESLint encuentra un error que no puede corregir, el commit se cancela.
- `commit-msg`: valida el mensaje con commitlint (`commitlint.config.mjs`). Si no cumple el formato, el commit se cancela y muestra qué regla falló.

No se saltan los hooks (`--no-verify`); si uno falla, se corrige la causa.

## 2. Ramas

- `main` siempre en verde y desplegable. No se hace push directo: todo entra por pull request.
- Ramas de trabajo cortas (días, no semanas), creadas desde `main` actualizado:

| Prefijo     | Para                                        | Ejemplo                               |
| ----------- | ------------------------------------------- | ------------------------------------- |
| `feat/`     | funcionalidad nueva                         | `feat/reserva-de-citas`               |
| `fix/`      | corrección de un bug                        | `fix/solapamiento-citas-consecutivas` |
| `refactor/` | cambio interno sin cambio de comportamiento | `refactor/arquitectura-modular`       |
| `test/`     | solo tests                                  | `test/e2e-doble-reserva`              |
| `docs/`     | solo documentación                          | `docs/contrato-api-disponibilidad`    |
| `chore/`    | tooling, dependencias, configuración        | `chore/actualizar-prisma`             |

Nombre en kebab-case y en español, describiendo el objetivo, no el ticket.

## 3. Commits

Formato **Conventional Commits**, verificado por commitlint:

```
<tipo>(<ámbito>): <descripción>

<cuerpo opcional: el porqué, no el qué>

<pie opcional: referencias, BREAKING CHANGE, Co-Authored-By>
```

**Tipo** (obligatorio, en inglés): `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`, `style`, `revert`.

**Ámbito** (opcional, pero si se usa debe ser uno de estos):

- backend: `auth`, `users`, `dentists`, `services`, `availability`, `appointments`, `observations`, `prisma`, `common`, `config`
- frontend: `reserva`, `mis-citas`, `agenda`, `servicios`, `odontologos`, `admin`, `cuenta`, `api`, `shared`, `e2e`
- transversales: `backend`, `frontend`, `docs`, `ci`, `deps`, `claude`

Para agregar un ámbito nuevo (por ejemplo un módulo nuevo) se edita `commitlint.config.mjs` en el mismo PR que lo introduce.

**Descripción**: en español, en imperativo o infinitivo ("agregar", "rechaza"), minúscula inicial, sin punto final, máximo 72 caracteres contando tipo y ámbito. Los pasos del ciclo TDD se marcan al inicio: `RED - ...`, `GREEN - ...`.

**Cuerpo**: opcional, separado por una línea en blanco, líneas de hasta 100 caracteres. Explica el porqué y las decisiones; lo que cambió ya se ve en el diff.

Ejemplos válidos:

```bash
git commit -m "test(appointments): RED - rechaza citas que se solapan con una activa"
git commit -m "feat(appointments): GREEN - detectar solapamiento con intervalos semiabiertos"
git commit -m "refactor(appointments): extraer calcularHoraFin al dominio"
git commit -m "fix(availability): no ofrecer slots anteriores a la hora actual"
git commit -m "docs(backend): documentar transiciones de estado permitidas"
git commit -m "chore(deps): actualizar prisma a 6.20"
git commit -m "ci: ejecutar tests de integración con postgres en github actions"
```

Con cuerpo:

```bash
git commit -m "feat(appointments): reprogramar liberando el horario anterior" -m "El PDF (sección 8) exige liberar el horario viejo solo si la nueva reserva
se concreta. Por eso ambas operaciones corren en la misma transacción y el
UPDATE del horario viejo va después de validar el nuevo."
```

Ejemplos que commitlint rechaza y por qué:

| Mensaje                                                                                 | Problema                                                                                                    |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `arreglos`                                                                              | sin tipo                                                                                                    |
| `feat: agregar reserva.`                                                                | punto final                                                                                                 |
| `feat: Agregar Reserva De Citas`                                                        | Title Case (commitlint lo rechaza); la minúscula inicial es convención del equipo salvo `RED -` / `GREEN -` |
| `feat(citas): agregar reserva`                                                          | ámbito `citas` no está en la lista                                                                          |
| `update appointments.service.ts`                                                        | sin tipo; describe el qué, no el porqué                                                                     |
| `feat(appointments): implementar toda la reserva, cancelación, reprogramación y agenda` | más de 72 caracteres; además debería ser varios commits                                                     |

**Commits atómicos**: un commit hace una sola cosa lógica. Separar refactor de funcionalidad y formato de comportamiento. Tamaño objetivo 100 a 300 líneas; más de 1000 se parte. Un commit no rompe los tests, salvo los `RED` del ciclo TDD.

## 4. Pull requests

1. Antes de abrirlo, en la carpeta tocada: `npm run lint && npm run format:check && npm run test` (backend además `npm run test:int`; frontend además `npm run test:e2e` si tocó un flujo del PDF).
2. Rama actualizada con `main` (rebase o merge, sin conflictos).
3. Completar la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`): qué, por qué, cómo probarlo y el checklist de Definition of Done.
4. El CI (`.github/workflows/ci.yml`) debe estar en verde: lint, formato, tests unitarios, integración con PostgreSQL, build, E2E y validación de los mensajes de commit.
5. Lo revisa la otra persona del equipo. Se mezcla con **squash** solo si los commits de la rama no aportan historia útil; si siguen el ciclo RED/GREEN/REFACTOR, se mezcla con merge normal para conservarlos.
6. Después de mezclar, se borra la rama.

## 5. Qué hacer con Claude Code

Cada carpeta tiene su `CLAUDE.md`, skills y agentes. Al trabajar con el agente: abrir la carpeta (`backend/` o `frontend/`) para que cargue los suyos, pedirle que siga el skill `ciclo-tdd`, y antes de abrir el PR correr los agentes revisores de esa carpeta (`revisor-codigo`, `revisor-tests-*`, y `auditor-seguridad-roles` o `revisor-flujos-ui` según toque).

## 6. Configuración del repositorio en GitHub (manual, la hace quien administra el repo)

Estas no se pueden versionar como archivos; se configuran en Settings → Branches → Branch protection rules para `main`:

- Require a pull request before merging (al menos 1 aprobación).
- Require status checks to pass: `Backend (lint, unit, integración, build)`, `Frontend (lint, unit, build, e2e)`, `Mensajes de commit`.
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings.
