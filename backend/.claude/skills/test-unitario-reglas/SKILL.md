---
name: test-unitario-reglas
description: Escribir tests unitarios con Jest para las reglas de negocio del sistema de citas (hora de fin, solapamiento, citas consecutivas, fechas inválidas, servicio habilitado, odontólogo realiza el servicio, transiciones de estado, slots disponibles, cancelación y reprogramación). Usar al crear o modificar funciones de dominio o services.
---

# Tests unitarios de reglas de negocio

El docente evalúa que los unitarios "prueben reglas reales, no métodos triviales", con "asserts utilizados correctamente", "casos positivos y negativos" y "mocks/stubs cuando corresponde". Este skill garantiza eso.

## Qué se prueba unitariamente
- **Dominio (`domain/`)**: sin ningún mock. Entradas producen salida o excepción.
- **Services**: con repositories reemplazados por fakes en memoria o `jest.fn()`. Se verifica orquestación (qué se llama, en qué orden, qué se lanza), no SQL.
- **No** se prueban unitariamente controllers ni repositories (eso es integración).

## Lista obligatoria (sección 12 del PDF) y archivo sugerido
| Regla | Archivo |
|---|---|
| Calcular hora de fin según duración del servicio | `src/modules/appointments/domain/end-time.spec.ts` |
| Detectar solapamiento entre dos citas | `src/modules/appointments/domain/overlap.spec.ts` |
| Permitir citas consecutivas que no se solapan | mismo archivo, `describe('citas consecutivas')` |
| Rechazar fechas u horarios inválidos (pasado, fin antes de inicio, fuera de horario) | `src/modules/appointments/domain/validation.spec.ts` |
| Validar que un servicio esté habilitado | `src/modules/services/domain/service-active.spec.ts` |
| Validar que el odontólogo realice el servicio | `src/modules/dentists/domain/performs-service.spec.ts` |
| Transiciones de estado permitidas y rechazadas | `src/modules/appointments/domain/appointment-status.spec.ts` |
| Determinar horarios disponibles (con duración, bloques, citas existentes, pasado) | `src/modules/availability/domain/slots.spec.ts` |
| Reglas de cancelación y reprogramación | `src/modules/appointments/appointments.service.spec.ts` |

## Estructura de cada test (AAA)

```ts
describe('seSolapan', () => {
  it('detecta solapamiento parcial cuando la segunda empieza antes de que termine la primera', () => {
    // Arrange
    const a = intervalo('2026-11-03T10:00Z', '2026-11-03T10:30Z');
    const b = intervalo('2026-11-03T10:15Z', '2026-11-03T10:45Z');

    // Act
    const resultado = seSolapan(a, b);

    // Assert
    expect(resultado).toBe(true);
  });

  it('permite citas consecutivas cuando el fin de una coincide con el inicio de la otra', () => {
    const a = intervalo('2026-11-03T10:00Z', '2026-11-03T10:30Z');
    const b = intervalo('2026-11-03T10:30Z', '2026-11-03T11:00Z');

    expect(seSolapan(a, b)).toBe(false);
  });
});
```

## Reglas del skill
1. Un `it` = una regla = un assert principal. Nombres en español describiendo la regla.
2. Para cada regla: al menos un caso positivo y uno negativo. Para solapamiento: parcial por inicio, parcial por fin, contenida, idéntica, consecutiva, separada, y cita CANCELADA ignorada.
3. Excepciones: `expect(() => fn()).toThrow(HorarioNoDisponibleError)`. Nunca `toThrow()` sin clase.
4. Transiciones de estado: usar `it.each` con la tabla completa de pares (desde, hacia, permitido). Cubrir los 5 estados por 5 estados.
5. Fechas: fijar el "ahora" inyectando un `Clock` (`{ now: () => Date }`) o `jest.useFakeTimers().setSystemTime(...)`. Nunca `new Date()` sin control en un test.
6. Slots: construir escenarios con un builder (`unOdontologoCon().horario('lunes', '09:00', '12:00').bloque(...).cita(...)`) para que el test se lea como la regla.
7. Services: mockear solo repositories y clock. Afirmar que ante error de dominio **no** se llamó a `create`/`update` (`expect(repo.create).not.toHaveBeenCalled()`).
8. Ejecutar `npm run test -- --coverage` y confirmar que `domain/` queda en 90% o más.
