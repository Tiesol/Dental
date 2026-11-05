# Guía de diseño del frontend

Reglas visuales de la interfaz, para que toda pantalla nueva se vea igual a las existentes. Los valores viven en `src/shared/styles/index.css`; si este documento y ese archivo difieren, gana el CSS y se corrige este documento.

## Principios

1. **Clínica y sobria.** Teal como único color de marca, sobre superficies claras con bordes finos. La jerarquía sale de la tipografía y el espacio, no de la decoración.
2. **Una acción principal por vista.** Un solo botón primario visible en cada zona; lo demás, secundario.
3. **El color nunca informa solo.** Todo estado lleva texto; las acciones destructivas dicen lo que hacen.
4. **Ninguna pantalla en blanco.** Toda vista con datos resuelve carga, vacío y error.

**No usar:** degradados, sombras, morado como color de marca, bordes muy redondeados, emojis, datos o textos de relleno, valores sueltos de color o tamaño, ni estilos inline salvo valores dinámicos.

## Paleta

Se usan siempre por token (`var(--primary)`), nunca el hexadecimal. El modo oscuro se aplica solo con `prefers-color-scheme`.

### Superficies y texto

| Token              | Claro     | Oscuro    | Uso                                        |
| ------------------ | --------- | --------- | ------------------------------------------ |
| `--bg`             | `#f3f6f7` | `#0f1619` | Fondo de la página                         |
| `--surface`        | `#ffffff` | `#172126` | Tarjetas, formularios, diálogos            |
| `--surface-sunken` | `#edf2f3` | `#1e2a30` | Encabezado de tabla, chips, hover discreto |
| `--text`           | `#16252b` | `#e6edef` | Texto principal                            |
| `--muted`          | `#526369` | `#a0b1b7` | Texto secundario y ayudas                  |
| `--border`         | `#dbe3e6` | `#2c3a40` | Bordes de tarjetas y separadores           |
| `--border-strong`  | `#84979e` | `#64787f` | Bordes de campos y botones secundarios     |

### Acción y mensajes

| Token             | Claro     | Oscuro    | Uso                                 |
| ----------------- | --------- | --------- | ----------------------------------- |
| `--primary`       | `#0b7285` | `#5cc8d7` | Botón principal, enlaces, foco      |
| `--primary-hover` | `#095c6b` | `#84d9e4` | Hover del botón principal           |
| `--primary-soft`  | `#e1f2f4` | `#14343c` | Avatar y mensajes informativos      |
| `--on-primary`    | `#ffffff` | `#06262c` | Texto sobre `--primary`             |
| `--error`         | `#b42318` | `#ff9d91` | Errores y acciones destructivas     |
| `--error-hover`   | `#912018` | `#ffb9b0` | Hover de la acción destructiva      |
| `--error-soft`    | `#fdecea` | `#3a1b18` | Fondo de mensajes de error          |
| `--on-error`      | `#ffffff` | `#3a0d08` | Texto sobre `--error`               |
| `--success`       | `#1b6e33` | `#84dc9e` | Éxito y estado habilitado           |
| `--success-soft`  | `#e6f4e9` | `#15301e` | Fondo de mensajes y badges de éxito |

En modo oscuro `--primary` y `--error` son claros, así que el texto encima debe ser `--on-primary` u `--on-error`, nunca `#fff`.

### Marca

Barra lateral y panel de acceso. Son oscuros en ambos modos, con su propio juego de colores.

| Token            | Claro     | Oscuro    | Uso                    |
| ---------------- | --------- | --------- | ---------------------- |
| `--brand-bg`     | `#0c3a44` | `#0b252c` | Fondo                  |
| `--brand-text`   | `#e3eff1` | `#e3eff1` | Texto                  |
| `--brand-muted`  | `#a9c6cc` | `#a9c6cc` | Texto secundario       |
| `--brand-line`   | `#24525d` | `#1e3f48` | Separadores y bordes   |
| `--brand-hover`  | `#174a55` | `#143740` | Hover                  |
| `--brand-active` | `#1f5e6b` | `#1b4853` | Página actual del menú |

### Estados de la cita

El texto del badge es el exacto del PDF, porque los E2E lo verifican. El mapa de estado a clase se define una sola vez en `shared/lib/estados-cita.ts`, y `EstadoCitaBadge` lo usa con `data-testid="estado-cita"`.

| Estado        | Texto         | Clase               | Texto claro / oscuro  | Fondo claro / oscuro  |
| ------------- | ------------- | ------------------- | --------------------- | --------------------- |
| `PENDIENTE`   | `PENDIENTE`   | `badge-pendiente`   | `#7f5200` / `#f2c86a` | `#fdf1d8` / `#3a2c10` |
| `CONFIRMADA`  | `CONFIRMADA`  | `badge-confirmada`  | `#135a9e` / `#93c5f5` | `#e4effa` / `#14304c` |
| `EN_ATENCION` | `EN ATENCIÓN` | `badge-en-atencion` | `#65409c` / `#cbb2f1` | `#f0eafa` / `#2d2246` |
| `FINALIZADA`  | `FINALIZADA`  | `badge-ok`          | `#1b6e33` / `#84dc9e` | `#e6f4e9` / `#15301e` |
| `CANCELADA`   | `CANCELADA`   | `badge-off`         | `#526369` / `#a0b1b7` | `#edf2f3` / `#1e2a30` |

### Contraste medido

Todas las combinaciones cumplen WCAG AA: 4.5:1 para texto y 3:1 para bordes de controles. Al agregar un token, medirlo en claro y en oscuro.

| Combinación                         | Claro | Oscuro |
| ----------------------------------- | ----- | ------ |
| `--text` sobre `--bg`               | 14.50 | 15.42  |
| `--muted` sobre `--surface-sunken`  | 5.56  | 6.62   |
| `--primary` sobre `--bg`            | 5.14  | 9.31   |
| `--on-primary` sobre `--primary`    | 5.59  | 8.10   |
| `--on-error` sobre `--error`        | 6.57  | 8.45   |
| `--error` sobre `--error-soft`      | 5.75  | 7.77   |
| `--success` sobre `--success-soft`  | 5.56  | 8.63   |
| Badge `PENDIENTE`                   | 6.03  | 8.56   |
| Badge `CONFIRMADA`                  | 6.04  | 7.42   |
| Badge `EN ATENCIÓN`                 | 6.45  | 7.82   |
| `--brand-muted` sobre `--brand-bg`  | 6.83  | 8.85   |
| `--border-strong` sobre `--surface` | 3.04  | 3.54   |

## Tipografía, espacio y forma

| Tipografía   | Tamaño     | Uso                                 |
| ------------ | ---------- | ----------------------------------- |
| `--text-2xl` | `2.25rem`  | Solo el panel de acceso             |
| `--text-xl`  | `1.625rem` | `h1`, uno por página                |
| `--text-lg`  | `1.125rem` | `h2`, marca                         |
| `--text-md`  | `1rem`     | Texto y campos                      |
| `--text-sm`  | `0.875rem` | Etiquetas, badges, ayudas, mensajes |

Fuente del sistema (`system-ui`), sin fuentes externas. Pesos: 400 texto, 500 navegación, 600 etiquetas y botones, 700 títulos de marca.

| Espacio | `--space-1` | `--space-2` | `--space-3` | `--space-4` | `--space-5` | `--space-6` | `--space-7` |
| ------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| Valor   | `0.25rem`   | `0.5rem`    | `0.75rem`   | `1rem`      | `1.5rem`    | `2rem`      | `3rem`      |

**Radios:** `--radius-sm` (6px) para controles, badges y mensajes; `--radius-md` (10px) para tarjetas y diálogos. Los únicos círculos son los avatares.

**Puntos de corte:** `30rem` activa `form-row` en dos columnas; `44rem` lleva las tablas de filas apiladas a filas normales; `56rem` cambia la barra superior por la barra lateral.

## Estructura de una pantalla

Toda página con sesión sigue esta forma. El `h1` lo pone `PageHeader`, nunca el formulario.

```tsx
<div className="page">
  <PageHeader title="Mis citas" description="Próximas e historial." actions={...} />
  <section className="card card-flush">
    {estado.status === 'cargando' && <LoadingState />}
    {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
    {estado.status === 'ok' && lista.length === 0 && <EmptyState title="No tienes citas próximas" />}
    {estado.status === 'ok' && lista.length > 0 && <div className="table-scroll">...</div>}
  </section>
</div>
```

| Clase                            | Para qué                                                          |
| -------------------------------- | ----------------------------------------------------------------- |
| `page`                           | Contenedor de la página, 68rem como máximo                        |
| `page page-narrow`               | Formularios y detalle, 40rem como máximo                          |
| `card`                           | Tarjeta con relleno, para formularios y secciones                 |
| `card card-flush`                | Tarjeta sin relleno, para listados con filtros y tablas           |
| `card-section`                   | Título, badge y texto agrupados dentro de una tarjeta             |
| `filters`, `filters-grow`        | Barra de filtros; `filters-grow` para el campo que debe crecer    |
| `filters-count`                  | "Mostrando 3 de 7 usuarios"                                       |
| `table-scroll`                   | Envuelve toda `table`; apila las filas en pantallas angostas      |
| `actions`                        | Celda de acciones de una fila                                     |
| `cell-person`, `cell-primary`    | Avatar con nombre y dato secundario; texto destacado de la fila   |
| `service-list`, `service`        | Lista de filas con texto y datos a la derecha                     |
| `service-meta`, `chips`          | Datos alineados de una fila; etiquetas pequeñas                   |
| `details`                        | Lista `dl` de pares etiqueta y valor                              |
| `form-row`, `form-actions`       | Dos campos en una fila; zona del botón de envío                   |
| `selector`                       | `fieldset` con casillas                                           |
| `muted`, `text-error`, `sr-only` | Texto secundario; aviso de error breve; solo lectores de pantalla |

## Componentes compartidos

En `src/shared/components/`. Usar estos antes de escribir marcado propio.

| Componente       | Cuándo                                                                          |
| ---------------- | ------------------------------------------------------------------------------- |
| `PageHeader`     | Siempre: título, descripción, acción principal y enlace de regreso              |
| `LoadingState`   | Mientras carga; nunca el texto "Cargando…" suelto                               |
| `EmptyState`     | Lista vacía: título con lo que pasa y, si aplica, qué hacer                     |
| `ErrorMessage`   | Errores de carga o envío. Lleva `role="alert"` y `data-testid="error-mensaje"`  |
| `SuccessMessage` | Confirmar que algo se guardó. Lleva `role="status"`                             |
| `ActiveBadge`    | Habilitado o Deshabilitado; `activeLabel` cambia el texto positivo              |
| `Avatar`         | Iniciales junto al nombre, nunca solas                                          |
| `Icon`           | Iconos decorativos junto a un texto. Para uno nuevo, agregar su trazo a `PATHS` |
| `useConfirm`     | Confirmar acciones destructivas; nunca `window.confirm`                         |

```tsx
const { confirm, dialog } = useConfirm();

const ok = await confirm({
  title: '¿Cancelar esta cita?',
  message: 'El horario quedará disponible para otros pacientes.',
  confirmLabel: 'Cancelar cita',
});
if (!ok) return;

// Y en el JSX: {dialog}
```

## Reglas de interacción

**Botones**

| Clase                 | Uso                                                   |
| --------------------- | ----------------------------------------------------- |
| (ninguna)             | Acción principal de la zona                           |
| `secondary`           | Acción alternativa                                    |
| `secondary danger`    | Acción destructiva dentro de una página o fila        |
| `danger`              | Solo la confirmación dentro del diálogo               |
| `button` en un `Link` | Navegación con aspecto de botón, como "Nuevo usuario" |

- La etiqueta dice la acción: "Deshabilitar cuenta", no "Sí" ni "Aceptar".
- Mientras se envía: botón deshabilitado y texto en curso ("Guardando…").
- Las acciones de una cita salen de `shared/lib/estados-cita.ts`, nunca de un `if` en el componente.

**Formularios**

- Todo control lleva `label` visible; un `placeholder` no lo reemplaza.
- Los opcionales se marcan con "(opcional)" en la etiqueta.
- Los campos relacionados y cortos van en `form-row`, como nombre y apellido.
- Deshabilitar o activar algo no es parte de guardar datos: va en su propia tarjeta, debajo del formulario.
- Los errores permanecen hasta la siguiente acción; no desaparecen solos.

**Horarios (slots)**

- Cada horario es un `button`, nunca un `div`, con `data-testid="slot-<HH:mm>"` y la hora local de la clínica, por ejemplo "09:00 - 09:30".
- La lista es la que devuelve el backend, sin filtrar en el cliente. Sin horarios: `EmptyState` con "No hay horarios disponibles para esta fecha".
- Un `409` al confirmar muestra "El horario ya no está disponible" y vuelve a cargar la lista.

**Textos**

- En español, directos y sin jerga técnica: nunca "409", "null" ni "undefined".
- Títulos con mayúscula inicial solamente. Sin punto final en títulos ni botones.

## Accesibilidad y responsive

- Un `h1` por página y sin saltos de nivel.
- Foco visible: no quitar el `outline`. Las páginas con sesión ya traen el enlace "Saltar al contenido".
- Debe usarse con teclado y a 360px de ancho, sin scroll horizontal de la página.
- Respetar `prefers-reduced-motion` en toda animación.
- No renombrar los `data-testid` de `CONVENCIONES.md` sección 4: los usan los E2E.

## Antes de dar por terminada una pantalla

Los tests corren con `css: false`, así que no detectan problemas visuales. Ya se escaparon así texto rojo sobre fondo rojo y una tabla que ensanchaba la página.

- [ ] Vista en el navegador a 360 y 1366 px, en modo claro y oscuro.
- [ ] Sin scroll horizontal de la página y sin errores en la consola.
- [ ] Carga, vacío y error revisados, no solo el caso con datos.
- [ ] Recorrida con teclado; en los diálogos, Escape cierra y el foco vuelve al botón.
- [ ] Solo tokens de esta guía, sin colores ni tamaños nuevos.
- [ ] Definition of Done del skill `ciclo-tdd`.
