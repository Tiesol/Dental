---
name: crear-feature
description: Crear o extender una feature del frontend React (páginas, componentes, hooks, llamadas a la API, tests y ruta) siguiendo la organización por features del proyecto. Usar al agregar una pantalla o un flujo nuevo (reserva, mis citas, agenda, administración).
---

# Crear o extender una feature

Sigue `ARQUITECTURA.md` secciones 3, 4 y 6 y `CONVENCIONES.md` secciones 2 y 4.

## Pasos

1. **Identifica la feature.** ¿Pertenece a una existente (`auth`, `servicios`, `odontologos`, `reserva`, `mis-citas`, `agenda`, `admin-citas`) o es nueva? Si es nueva, confirma con el usuario que corresponde al alcance del PDF.
2. **Contrato de API primero.** Verifica que los endpoints necesarios existen en `src/api/endpoints/` y los tipos en `src/api/types.ts`. Si falta uno, agrégalo con el skill `consumo-api` antes de tocar la UI.
3. **Hooks de datos.** Un hook por consulta (`useMisCitas`) y uno por mutación (`useCancelarCita`). La mutación declara qué claves de caché invalida (ver `ARQUITECTURA.md` sección 6). Sin esto, la disponibilidad no se actualiza tras reservar/cancelar/reprogramar.
4. **Componentes.** Pequeños, de presentación, con props tipadas. Las acciones permitidas por estado y rol se leen de `shared/lib/estados-cita.ts`, no se calculan en el componente.
5. **Página.** Compone hooks y componentes. Maneja estados de carga, vacío y error con los componentes compartidos (`EmptyState`, `ErrorMessage`).
6. **Ruta.** Agrega la ruta en `app/router.tsx` dentro del grupo `RequireRole` correcto.
7. **`data-testid`.** Coloca los identificadores de `CONVENCIONES.md` sección 4 en botones de acción, slots, badge de estado y mensajes de error.
8. **Tests de componentes** (skill `test-componente`) para los comportamientos de la feature, con MSW.
9. **E2E** (skill `e2e-playwright`) si la feature es parte de un escenario del PDF.
10. **Verifica**: `npm run lint && npm run test`.

## Plantilla de hook de mutación

```ts
export function useCancelarCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.cancelar(id),
    onSuccess: (cita) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', cita.id] });
      queryClient.invalidateQueries({ queryKey: ['slots', cita.dentistId] });
    },
  });
}
```

## Checklist antes de dar por terminado

- [ ] Ningún `fetch` fuera de `src/api/`.
- [ ] Las acciones por estado vienen de `estados-cita.ts`.
- [ ] Mutaciones invalidan slots y listas afectadas.
- [ ] Estados de carga, vacío y error visibles.
- [ ] Textos en español; estados con el texto exacto del PDF.
- [ ] `data-testid` presentes y sin renombrar los existentes.
