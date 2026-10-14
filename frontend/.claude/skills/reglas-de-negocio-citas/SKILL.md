---
name: reglas-de-negocio-citas
description: Reglas de negocio del Sistema de Citas para Clínica Dental (PDF del docente) vistas desde la interfaz: qué debe mostrar, permitir u ocultar cada pantalla según rol y estado de la cita. Consultar antes de implementar o revisar cualquier pantalla de servicios, odontólogos, reserva, mis citas, agenda o administración.
---

# Reglas de negocio en la interfaz

Fuente: el PDF `proyecto_final_taller_v_citas_dentales.pdf` del docente. La versión completa de las reglas (con detalle de backend) está en `../backend/.claude/skills/reglas-de-negocio-citas/SKILL.md`. Aquí se listan en términos de lo que la UI debe hacer. Recuerda: la UI refleja reglas; el backend las decide. Toda acción debe manejar 409 y 403 aunque la UI la haya mostrado como válida.

## Alcance

Solo citas: servicios, odontólogos, disponibilidad, reservas, seguimiento. **No** construir pantallas de pagos, seguros, facturación ni inventario.

## Por rol

| Rol        | Pantallas                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PACIENTE   | Registro, login, catálogo de servicios, odontólogos, asistente de reserva, mis citas (próximas e historial), detalle de cita con reprogramar/cancelar.  |
| ODONTOLOGO | Login, agenda (hoy y próximas), detalle de cita con cambio de estado y observación.                                                                     |
| ADMIN      | Login, gestión de servicios, gestión de odontólogos (datos, estado, servicios que realiza, horarios y bloques), todas las citas con confirmar/cancelar. |

## Servicios

- El catálogo del paciente muestra **solo servicios habilitados**. El admin ve todos con su estado y puede habilitar/deshabilitar.
- Formulario de servicio: nombre, descripción, duración en minutos (entero positivo, obligatorio), precio referencial (opcional), estado.

## Odontólogos

- En el asistente de reserva, tras elegir servicio, se listan **solo odontólogos habilitados que realizan ese servicio**.
- El admin puede deshabilitar un odontólogo; sus citas históricas siguen visibles.

## Disponibilidad y slots

- El paso fecha/hora muestra los slots que devuelve `GET /dentists/:id/slots?serviceId=&fecha=`. No se calculan ni filtran en el cliente.
- Si no hay slots: mensaje "No hay horarios disponibles para esta fecha".
- Los slots ya muestran la duración del servicio ("09:00 - 09:30").
- Fechas pasadas no seleccionables en el calendario.

## Reserva (E2E 01)

- Pasos: servicio → odontólogo → fecha/hora → resumen → confirmar.
- Tras confirmar: redirigir a Mis citas y mostrar la cita nueva en estado PENDIENTE.
- Si el backend responde 409 (E2E 02): mostrar "El horario ya no está disponible" en `data-testid="error-mensaje"`, refrescar slots y permanecer en el paso fecha/hora.

## Estados y acciones visibles

Tabla en `ARQUITECTURA.md` sección 7. Resumen:

- PENDIENTE / CONFIRMADA: paciente ve Reprogramar y Cancelar.
- CONFIRMADA: odontólogo ve "Iniciar atención".
- EN_ATENCION: odontólogo ve "Registrar observación" y "Finalizar" (Finalizar deshabilitado hasta que haya observación).
- FINALIZADA y CANCELADA: sin acciones para nadie.
- ADMIN: Confirmar en PENDIENTE; Cancelar en PENDIENTE y CONFIRMADA.
- El badge de estado muestra el texto exacto del PDF.

## Reprogramar (E2E 03)

- Desde el detalle de una cita PENDIENTE o CONFIRMADA. Reutiliza el paso fecha/hora del mismo odontólogo y servicio.
- Tras confirmar: el detalle muestra el nuevo horario; si se vuelve al paso de slots del horario antiguo, ese slot reaparece disponible.
- Si falla (409), la cita conserva su horario original y se informa.

## Cancelar (E2E 04)

- Confirmación modal antes de cancelar. Tras cancelar: badge CANCELADA y el slot vuelve a aparecer en disponibilidad.

## Agenda del odontólogo (E2E 05)

- Lista ordenada por fecha y hora. Secciones "Hoy" y "Próximas".
- Cada ítem: nombre del paciente, servicio, horario, estado, observación si existe.
- Flujo de atención: Iniciar atención → registrar observación → Finalizar.

## Historial del paciente (E2E 06)

- Pestañas o secciones "Próximas" e "Historial". El detalle de una FINALIZADA muestra servicio, odontólogo, fecha, horario, estado y observación.

## Control de acceso (E2E 07)

- Navegar a `/mis-citas/:id` de una cita ajena: la API responde 403 y la UI muestra "No tienes acceso a esta cita" sin exponer ningún dato.
- Rutas por rol protegidas con `RequireRole`; sin sesión se redirige a `/login`.

## Validaciones en cliente (solo UX, el backend repite todo)

Campos obligatorios, email válido, contraseña mínima, duración positiva, fecha no pasada. No validar solapamientos ni disponibilidad en el cliente.
