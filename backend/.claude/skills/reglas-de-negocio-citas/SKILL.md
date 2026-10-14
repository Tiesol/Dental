---
name: reglas-de-negocio-citas
description: Reglas de negocio del Sistema de Citas para Clínica Dental extraídas del PDF del docente. Consultar antes de implementar o revisar cualquier regla de servicios, odontólogos, disponibilidad, reservas, estados, reprogramación, cancelación o control de acceso. Es la fuente de verdad para decidir qué es válido y qué debe rechazarse.
---

# Reglas de negocio — Citas dentales

Fuente: el PDF `proyecto_final_taller_v_citas_dentales.pdf` del docente (secciones 3 a 11 y checklist de la sección 15). Cuando una regla de aquí entre en conflicto con código existente, gana esta lista y el código se corrige.

## Alcance
Gestión de citas odontológicas: servicios, profesionales, disponibilidad, reservas y seguimiento. **Fuera de alcance**: pagos, seguros, facturación electrónica, inventario. No implementar nada de eso aunque parezca útil.

## Roles
| Rol | Puede |
|---|---|
| PACIENTE | Registrarse, iniciar sesión, ver servicios y odontólogos, ver disponibilidad, reservar, reprogramar, cancelar, ver próximas citas e historial **propios**. |
| ODONTOLOGO | Iniciar sesión, ver **su** agenda (citas del día y próximas), cambiar estados permitidos, registrar observación de atención. |
| ADMIN | Administrar odontólogos, servicios y horarios; ver todas las citas; confirmar o cancelar citas; habilitar/deshabilitar profesionales. |

## Servicios
- Campos mínimos: nombre, descripción, duración estimada en minutos (**positiva**), precio referencial (**opcional**), estado habilitado/deshabilitado.
- Un servicio deshabilitado **no** está disponible para nuevas reservas (ni aparece en el catálogo del paciente, ni el backend acepta una reserva con él).
- Ejemplos de catálogo: limpieza dental, consulta y diagnóstico, ortodoncia, extracción, blanqueamiento, otros configurables.

## Odontólogos
- Campos: nombre, especialidad, estado, agenda de disponibilidad, lista de servicios que realiza.
- Solo se puede reservar con un odontólogo que **realice** el servicio elegido.
- Un odontólogo deshabilitado **no acepta nuevas citas**, pero sus citas históricas se conservan (no se borran ni se cancelan automáticamente).

## Disponibilidad y agenda
- Cada odontólogo tiene días y horarios de atención (reglas semanales) y puede tener **bloques no disponibles** (pausas).
- Los slots disponibles se calculan **considerando la duración del servicio**: un slot es válido solo si `[inicio, inicio + duración)` cabe completo dentro del horario de atención, no toca un bloque no disponible y no se solapa con ninguna cita activa.
- **No se ofrecen horarios anteriores a la fecha/hora actual.**
- La disponibilidad se actualiza tras reservar, cancelar o reprogramar (no hay caché que la desactualice).

## Regla crítica: solapamiento
Dos citas **activas** (cualquier estado distinto de CANCELADA) del **mismo odontólogo** no pueden ocupar total o parcialmente el mismo horario.
- Intervalos semiabiertos `[inicio, fin)`. Dos citas son consecutivas (y válidas) si `fin_A == inicio_B`.
- Solapan si `inicio_A < fin_B && inicio_B < fin_A`.
- Una cita CANCELADA **no** bloquea el horario.

## Reserva
- El paciente elige servicio, luego odontólogo que lo realiza, luego horario disponible, y confirma.
- La cita almacena como mínimo: paciente, odontólogo, servicio, fecha, hora de inicio, hora de fin, estado, fecha de creación.
- `horaFin = horaInicio + duracionDelServicio`. La calcula el backend.
- **Antes de confirmar, el backend vuelve a validar que el horario siga disponible**, dentro de una transacción, para resistir dos solicitudes casi simultáneas.
- Estado inicial de una cita nueva: PENDIENTE.

## Estados y transiciones
Estados mínimos: PENDIENTE, CONFIRMADA, EN_ATENCION, FINALIZADA, más CANCELADA.
- Transiciones permitidas: ver tabla en `ARQUITECTURA.md` sección 6.
- Transiciones inválidas se rechazan (409). Una FINALIZADA no se cancela ni vuelve a PENDIENTE. CANCELADA es terminal.
- EN_ATENCION → FINALIZADA requiere que exista observación de atención (o se registre en la misma operación).

## Reprogramación y cancelación
- Reprogramar: el paciente elige otro horario disponible. **El horario anterior se libera solamente si la nueva reserva pudo realizarse.** Si el nuevo horario falla, la cita queda intacta.
- Cancelar: el horario vuelve a estar disponible inmediatamente.
- No se puede cancelar ni reprogramar una cita FINALIZADA (ni CANCELADA, ni EN_ATENCION).
- Solo el paciente dueño o el ADMIN cancelan/reprograman.

## Agenda del odontólogo
- Citas ordenadas por fecha y hora. Vistas: citas del día, próximas citas.
- Cada ítem muestra: datos básicos del paciente, servicio, estado, observación.
- Un odontólogo **no** puede ver la agenda de otro (403).

## Historial del paciente
- Citas futuras y anteriores con servicio, profesional, fecha, horario y estado.
- Un paciente **solo** accede a sus propias citas. Intentar ver una ajena devuelve 403 (E2E 07).

## Validaciones obligatorias (sección 11)
Campos obligatorios, fechas y horas válidas, duración positiva, servicio y odontólogo existentes, disponibilidad real, prevención de solapamientos. Todas se aplican en el backend aunque el frontend ya las haya hecho.

## Lo que evalúa el docente (checklist sección 15)
Al implementar una regla, revisar que exista un test unitario y/o de integración que la proteja. Los tests deben probar **reglas reales**, no métodos triviales, con casos positivos y negativos y asserts específicos. Toda la suite debe poder ejecutarse de nuevo durante la evaluación.
