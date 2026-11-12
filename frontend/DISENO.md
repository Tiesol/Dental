# Guía de diseño del frontend

Reglas visuales de la interfaz, para que toda pantalla nueva se vea igual a las existentes. Los valores viven en `src/shared/styles/index.css`; si este documento y ese archivo difieren, gana el CSS y se corrige este documento.

## Principios

1. **Clínica y sobria.** Azul como único color de marca, sobre superficies claras con bordes finos. La jerarquía sale de la tipografía y el espacio, no de la decoración.
2. **Una acción principal por vista.** Un solo botón primario visible en cada zona; lo demás, secundario.
3. **El color nunca informa solo.** Todo estado lleva texto; las acciones destructivas dicen lo que hacen.
4. **Ninguna pantalla en blanco.** Toda vista con datos resuelve carga, vacío y error.

**No usar:** degradados, sombras, morado como color de marca, bordes muy redondeados, emojis, datos o textos de relleno, valores sueltos de color o tamaño, ni estilos inline salvo valores dinámicos.

## Paleta

"Azul clínico", una sola paleta clara: la interfaz no tiene modo oscuro (`color-scheme: light`). Se usan siempre por token (`var(--primary)`), nunca el hexadecimal.

### Superficies y texto

| Token               | Valor                  | Uso                                            |
| ------------------- | ---------------------- | ---------------------------------------------- |
| `--bg`              | `#f5f8fc`              | Fondo de la página                             |
| `--surface`         | `#ffffff`              | Tarjetas, formularios, diálogos, barra lateral |
| `--surface-sunken`  | `#eef3f9`              | Encabezado de tabla, chips, hover discreto     |
| `--surface-pressed` | `#e2e9f3`              | Botón secundario presionado                    |
| `--text`            | `#172033`              | Texto principal                                |
| `--muted`           | `#4f5d73`              | Texto secundario y ayudas                      |
| `--border`          | `#dde5ef`              | Bordes de tarjetas y separadores               |
| `--border-strong`   | `#7d8aa0`              | Bordes de campos y botones secundarios         |
| `--backdrop`        | `rgb(23 32 51 / 0.45)` | Fondo detrás de un diálogo abierto             |

### Acción y mensajes

| Token              | Valor     | Uso                                          |
| ------------------ | --------- | -------------------------------------------- |
| `--primary`        | `#1d5fd1` | Botón principal, enlaces, foco, menú activo  |
| `--primary-hover`  | `#184fb0` | Hover del botón principal                    |
| `--primary-active` | `#133f8c` | Botón principal presionado                   |
| `--primary-soft`   | `#e6effc` | Avatar, menú activo, pestaña elegida, avisos |
| `--on-primary`     | `#ffffff` | Texto sobre `--primary`                      |
| `--error`          | `#b42318` | Errores y acciones destructivas              |
| `--error-hover`    | `#912018` | Hover de la acción destructiva               |
| `--error-active`   | `#761a14` | Acción destructiva presionada                |
| `--error-soft`     | `#fdecea` | Fondo de mensajes de error                   |
| `--on-error`       | `#ffffff` | Texto sobre `--error`                        |
| `--success`        | `#1b6e33` | Éxito y estado habilitado                    |
| `--success-soft`   | `#e6f4e9` | Fondo de mensajes y badges de éxito          |

La barra lateral y el panel de acceso usan las mismas superficies que el resto (blanco con borde), sin colores propios.

### Estados de la cita

El texto del badge es el exacto del PDF, porque los E2E lo verifican. El mapa de estado a clase se define una sola vez en `shared/lib/estados-cita.ts`, y `EstadoCitaBadge` lo usa con `data-testid="estado-cita"`.

| Estado        | Texto         | Clase               | Texto     | Fondo     |
| ------------- | ------------- | ------------------- | --------- | --------- |
| `PENDIENTE`   | `PENDIENTE`   | `badge-pendiente`   | `#7f5200` | `#fdf1d8` |
| `CONFIRMADA`  | `CONFIRMADA`  | `badge-confirmada`  | `#0b6470` | `#dff2f3` |
| `EN_ATENCION` | `EN ATENCIÓN` | `badge-en-atencion` | `#65409c` | `#f0eafa` |
| `FINALIZADA`  | `FINALIZADA`  | `badge-ok`          | `#1b6e33` | `#e6f4e9` |
| `CANCELADA`   | `CANCELADA`   | `badge-off`         | `#4f5d73` | `#eef3f9` |

`CONFIRMADA` es verde azulado y no azul, para no confundirse con el color de acción.

### Contraste medido

Todas las combinaciones cumplen WCAG AA: 4.5:1 para texto y 3:1 para bordes de controles. Al agregar un token, medirlo.

| Combinación                         | Ratio |
| ----------------------------------- | ----- |
| `--text` sobre `--bg`               | 15.27 |
| `--muted` sobre `--surface-sunken`  | 5.98  |
| `--primary` sobre `--bg`            | 5.46  |
| `--primary` sobre `--primary-soft`  | 5.02  |
| `--on-primary` sobre `--primary`    | 5.82  |
| `--on-error` sobre `--error`        | 6.57  |
| `--error` sobre `--error-soft`      | 5.75  |
| `--success` sobre `--success-soft`  | 5.56  |
| `--text` sobre `--surface-pressed`  | 13.31 |
| Badge `PENDIENTE`                   | 6.03  |
| Badge `CONFIRMADA`                  | 5.90  |
| Badge `EN ATENCIÓN`                 | 6.45  |
| `--border-strong` sobre `--surface` | 3.49  |
| `--border-strong` sobre `--bg`      | 3.28  |

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
| `field-filter`                   | Campo dentro de `filters` (`fieldClassName` o `variant="filter"`) |
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

| Componente          | Cuándo                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `PageHeader`        | Siempre: título, descripción, acción principal y enlace de regreso                          |
| `LoadingState`      | Mientras carga; nunca el texto "Cargando…" suelto                                           |
| `EmptyState`        | Lista vacía: título con lo que pasa y, si aplica, qué hacer                                 |
| `ErrorMessage`      | Errores de carga o envío. Lleva `role="alert"` y `data-testid="error-mensaje"`              |
| `SuccessMessage`    | Confirmar que algo se guardó. Lleva `role="status"`                                         |
| `ActiveBadge`       | Habilitado o Deshabilitado; `activeLabel` cambia el texto positivo                          |
| `Avatar`            | Iniciales junto al nombre, nunca solas                                                      |
| `Icon`              | Iconos decorativos junto a un texto. Para uno nuevo, agregar su trazo a `PATHS`             |
| `Button`            | Todo botón. `variant` elige el estilo y `loading` muestra el spinner                        |
| `ButtonLink`        | Navegación con aspecto de botón, como "Nuevo usuario"                                       |
| `TextField`         | Campo de texto, email, contraseña o número con etiqueta, ayuda y error                      |
| `TextArea`          | Texto largo, con la misma etiqueta, ayuda y error que `TextField`                           |
| `Select`            | Toda lista de opciones; nunca `<select>`. `variant="filter"` dentro de `filters`            |
| `DateField`         | Toda fecha; nunca `type="date"`. Se escribe `dd/mm/aaaa` o se elige en el calendario        |
| `TimeField`         | Toda hora; nunca `type="time"`. Se escribe `HH:mm` o se elige de a 15 minutos               |
| `useForm`           | Valores, reglas y errores de un formulario (ver Formularios)                                |
| `useFieldErrors`    | Igual que `useForm` cuando los valores ya viven en otro estado, como una lista de tramos    |
| `useConfirm`        | Confirmar acciones destructivas; nunca `window.confirm`                                     |
| `ErrorBoundary`     | Solo en `main.tsx`: si falla el render, muestra la pantalla de error en vez de nada         |
| `GlobalErrorNotice` | Solo en `App.tsx`: avisa errores sin capturar (clics, timers, promesas) sin tumbar la vista |

Los desplegables de `Select`, `DateField` y `TimeField` se abren en un portal anclado al control (`useAnchoredPopover`): no los recorta un contenedor con scroll, se abren hacia arriba si no entran abajo y, dentro de un diálogo, Escape cierra solo la lista.

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

Siempre con `Button` (o `ButtonLink` para navegar); los estilos viven en `.btn` y no se repiten por pantalla.

| `variant`        | Uso                                                      |
| ---------------- | -------------------------------------------------------- |
| `primary`        | Acción principal de la zona (valor por defecto)          |
| `secondary`      | Acción alternativa                                       |
| `danger-outline` | Acción destructiva dentro de una página o fila           |
| `danger`         | Solo la confirmación dentro del diálogo                  |
| `tab`            | Pestañas (`role="tab"`); la elegida va subrayada         |
| `ghost`          | Botón de icono, como las flechas del calendario o cerrar |

- La etiqueta dice la acción: "Deshabilitar cuenta", no "Sí" ni "Aceptar".
- Hover cambia fondo o borde; al presionar se oscurece y se achica a `scale(0.97)`.
- `loading` solo en botones que esperan respuesta (guardar, enviar, cambiar estado): muestra un spinner en lugar del texto, sin cambiar el ancho, con `disabled` y `aria-busy="true"`. Se enciende al hacer clic y se apaga en el `finally`. Los botones de acción inmediata (cancelar, abrir un diálogo, cambiar de pestaña, navegar, copiar) no llevan `loading`.
- Las acciones de una cita salen de `shared/lib/estados-cita.ts`, nunca de un `if` en el componente.

**Formularios**

- Todo control lleva `label` visible; un `placeholder` no lo reemplaza.
- Los opcionales se marcan con "(opcional)" en la etiqueta.
- Los campos relacionados y cortos van en `form-row`, como nombre y apellido.
- Deshabilitar o activar algo no es parte de guardar datos: va en su propia tarjeta, debajo del formulario.
- El `form` lleva `noValidate`: valida `useForm` (o `useFieldErrors`), no el navegador. Las reglas están en `shared/lib/validators.ts` (`required`, `email`, `minLength`, `maxLength`, `combine`).
- Cada campo se valida al salir de él, nunca mientras se escribe. Si ya muestra un error, al escribir se vuelve a validar solo para quitarlo en cuanto quede bien.
- Al enviar se valida todo y el foco va al primer campo con error. El error se muestra debajo del campo, con `aria-invalid` y `aria-describedby`.
- Los errores de envío permanecen hasta la siguiente acción; no desaparecen solos.

**Errores inesperados**

- Los errores esperados (validación, `4xx` de negocio) se muestran con `ErrorMessage` donde ocurren.
- Lo inesperado lo atienden `ErrorBoundary` (render) y `GlobalErrorNotice` (eventos y promesas). Ambos usan `ErrorDetails`: un mensaje para el usuario con "Copiar detalle" y "Recargar", y un detalle técnico desplegable con código del backend, fecha, usuario, pantalla, error, stack y componentes.
- Se ignoran las cancelaciones (`AbortError`) y el ruido del navegador o de extensiones.

**Carga de datos**

- Los requests de una pantalla se cancelan al salir de ella o al cambiar un filtro (`useCarga` pasa un `AbortSignal`).
- La búsqueda por texto espera 300 ms sin teclear (`useDebouncedValue`) antes de pedir.
- Una acción sobre una fila actualiza solo esa fila con la respuesta del backend, sin recargar el listado.

**Horarios (slots)**

- Cada horario es un `Button`, nunca un `div`, con `data-testid="slot-<HH:mm>"` y la hora local de la clínica, por ejemplo "09:00 - 09:30".
- La lista es la que devuelve el backend, sin filtrar en el cliente. Sin horarios: `EmptyState` con "No hay horarios disponibles para esta fecha".
- Un `409` al confirmar muestra "El horario ya no está disponible" y vuelve a cargar la lista.

**Textos**

- En español, directos y sin jerga técnica: nunca "409", "null" ni "undefined".
- Títulos con mayúscula inicial solamente. Sin punto final en títulos ni botones.

## Accesibilidad y responsive

- Un `h1` por página y sin saltos de nivel.
- Foco visible: no quitar el `outline`. Las páginas con sesión ya traen el enlace "Saltar al contenido".
- Debe usarse con teclado y a 360px de ancho, sin scroll horizontal de la página.
- Respetar `prefers-reduced-motion` en toda animación. Las animaciones son cortas (120 a 180 ms) y solo de entrada de listas, calendario, diálogos y avisos; con movimiento reducido se anulan, salvo el spinner, que gira más lento.
- No renombrar los `data-testid` de `CONVENCIONES.md` sección 4: los usan los E2E.

## Antes de dar por terminada una pantalla

Los tests corren con `css: false`, así que no detectan problemas visuales. Ya se escaparon así texto rojo sobre fondo rojo y una tabla que ensanchaba la página.

- [ ] Vista en el navegador a 360 y 1366 px.
- [ ] Sin scroll horizontal de la página y sin errores en la consola.
- [ ] Carga, vacío y error revisados, no solo el caso con datos.
- [ ] Recorrida con teclado; en los diálogos, Escape cierra y el foco vuelve al botón.
- [ ] Solo tokens de esta guía, sin colores ni tamaños nuevos.
- [ ] Definition of Done del skill `ciclo-tdd`.
