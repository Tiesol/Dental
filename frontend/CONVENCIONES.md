# Convenciones del frontend (React + Vite + TypeScript)

Reglas de estilo y de trabajo que aplican a todo el código del frontend. Si algo no está aquí, se siguen las recomendaciones oficiales de React y de Vite.

---

## 1. Idioma

- **Código (identificadores, archivos de infraestructura): inglés.** `useAuth`, `http.ts`, `AppointmentCard`.
- **Nombres de features, rutas, textos de interfaz y mensajes: español**, porque es lo que ve el docente y lo que verifican los E2E. Carpetas de features en español (`reserva/`, `mis-citas/`, `agenda/`).
- **Componentes de dominio con nombre en español en PascalCase**: `ResumenConfirmacion`, `EstadoCitaBadge`, `ListaSlots`. Componentes genéricos de `shared/components/` en inglés (`Button`, `Modal`).
- **Estados de cita** se muestran con el texto exacto del PDF: PENDIENTE, CONFIRMADA, EN ATENCIÓN, FINALIZADA, CANCELADA.
- Comentarios, documentación y nombres de tests en español.

## 2. Archivos y carpetas

- Componentes: `PascalCase.tsx`, un componente exportado por archivo, nombre de archivo igual al componente.
- Hooks: `useNombre.ts`. Utilidades: `kebab-case.ts`.
- Tests junto al archivo que prueban: `Componente.test.tsx`, `dates.test.ts`. E2E en `e2e/*.e2e.ts`.
- Cada feature expone su API pública en `index.ts`; desde fuera solo se importa `@/features/reserva`, nunca rutas internas.
- Alias `@/` apunta a `src/`.

## 3. TypeScript

- `strict: true`. Prohibido `any`. Props siempre tipadas con `type Props = {...}`.
- Los tipos del contrato REST viven solo en `src/api/types.ts` y son el espejo de los DTOs del backend. Cuando el backend cambia un DTO, se actualiza este archivo en el mismo cambio.
- Enums de negocio como union types literales: `type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'EN_ATENCION' | 'FINALIZADA' | 'CANCELADA'`.
- Fechas de la API se tipan como `string` (ISO) y se convierten a `Date` solo en `shared/lib/dates.ts`.

## 4. React

- Solo componentes funcionales y hooks. Sin clases.
- Componentes de página (`pages/`) solo componen; no contienen llamadas a la API ni lógica de negocio.
- Toda llamada a la API pasa por un hook de la feature (`useReservarCita`) que a su vez usa `src/api/endpoints/`. Prohibido `fetch` o `axios` fuera de `src/api/`.
- Estado local con `useState`/`useReducer`; estado de servidor en la capa de caché de datos; sin store global salvo `AuthContext`.
- Formularios: cada formulario valida en cliente con mensajes en español y deshabilita el botón de envío mientras está en curso.
- Accesibilidad mínima: todo control tiene `label`; botones con texto o `aria-label`; listas de slots como botones, no `div` clicables; foco visible.
- `data-testid` en: botones de acción de cita (`btn-reservar`, `btn-reprogramar`, `btn-cancelar`, `btn-confirmar`, `btn-iniciar-atencion`, `btn-finalizar`), slots (`slot-<HH:mm>`), badge de estado (`estado-cita`), filas de cita (`cita-<id>`), mensajes de error (`error-mensaje`). Se mantienen estables porque los E2E dependen de ellos.

## 5. Estilos

- Una sola solución de estilos para todo el proyecto. Hoy: CSS global en `src/shared/styles/index.css` con variables (`--primary`, `--error`, ...) y clases utilitarias (`card`, `muted`, `error`). Propuesta para cuando crezca: CSS Modules (ver "Decisiones" en el README raíz). No mezclar con estilos inline salvo valores dinámicos.
- Colores de estado de cita definidos una sola vez en `shared/lib/estados-cita.ts`.
- Diseño responsive mínimo: usable en 360px de ancho.

## 6. Tests

- Patrón **AAA** con líneas en blanco entre Arrange, Act y Assert.
- RTL: consultar por rol y texto (`getByRole('button', { name: 'Reservar' })`) antes que por `data-testid`; el `testid` es para E2E y para elementos sin rol semántico.
- API simulada con **MSW** en tests de componentes; nunca mockear `fetch` a mano ni los hooks de la feature.
- Un `it` por comportamiento, nombre en español: `it('oculta el botón Cancelar cuando la cita está FINALIZADA')`.
- Asserts específicos (`toBeInTheDocument`, `toBeDisabled`, `toHaveTextContent('CANCELADA')`). Prohibido `toBeTruthy()` como único assert.
- E2E: Page Objects, un escenario por archivo, datos creados por seed antes de cada test, sin dependencias entre escenarios.
- Infraestructura: `vitest.config.ts` (jsdom, setup en `src/test/setup.ts`), `src/test/msw/` (handlers y server), `src/test/factories.ts`, `src/test/utils.tsx` (`renderWithProviders`), `playwright.config.ts` (levanta Vite; `e2e/*.e2e.ts`).
- Comandos canónicos: `npm run test` (Vitest), `npm run test:watch`, `npm run test:cov`, `npm run test:e2e` (Playwright), `npm run test:e2e:ui`.

## 7. Git

La guía completa (ramas, formato exacto de commits con tipos y ámbitos permitidos, pull requests, hooks) está en `../CONTRIBUTING.md`. Resumen:

- Rama principal `main`, solo por pull request. Ramas `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`.
- Conventional Commits validados por commitlint en el hook `commit-msg`: `tipo(ámbito): descripción`, tipo en inglés, ámbito de la lista de `../commitlint.config.mjs` (`reserva`, `mis-citas`, `agenda`, `api`, `shared`, `e2e`...), descripción en español en minúscula, sin punto final, máximo 72 caracteres:
  `feat(reserva): mostrar solo odontólogos que realizan el servicio elegido`
  `test(e2e): escenario 02 evitar doble reserva`
- El hook `pre-commit` corre ESLint y Prettier sobre los archivos en stage; un error de lint cancela el commit.
- **Commits atómicos**: un commit hace una sola cosa lógica; con TDD cada paso puede ser un commit (`test(...): RED`, `feat(...): GREEN`, `refactor(...)`). Tamaño objetivo 100 a 300 líneas.
- **Separar refactor de funcionalidad** y formato de comportamiento: nunca en el mismo commit.
- El cuerpo del commit explica el **por qué**, no lo que ya se ve en el diff.
- Antes de commitear: `npm run lint && npm run test && npm run build`.
- `main` siempre en verde; ramas de trabajo cortas.

## 8. Formato y lint

- ESLint 9 (flat config en `eslint.config.js`: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`) y Prettier (`.prettierrc`: 2 espacios, comillas simples, punto y coma, `printWidth: 100`, trailing commas `all`). `no-explicit-any` es error.
- Comandos: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
- TypeScript 6 con `erasableSyntaxOnly`: sin parameter properties en constructores, sin `enum`, sin `namespace`. Usar campos declarados y union types.
- Imports ordenados: React → externos → `@/` → relativos.
- Sin `console.log` en código de producción.

## 9. Documentación

- `README.md` del frontend con: requisitos, variables de entorno, cómo levantar el frontend contra el backend, cómo correr tests unitarios y E2E. Debe poder seguirse en la evaluación sin ayuda.
- Cada feature tiene una línea en su `index.ts` describiendo qué cubre.
