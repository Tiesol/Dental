## Qué cambia

<!-- Una o dos frases. Qué regla del PDF o qué parte del sistema toca. -->

## Por qué

<!-- Requisito del PDF (sección), bug reproducido o decisión del equipo. -->

## Cómo probarlo

<!-- Comandos o pasos en la interfaz para que quien revisa lo verifique. -->

## Checklist (Definition of Done, skill `ciclo-tdd`)

- [ ] Tests nuevos que fallan sin el cambio y pasan con él (unitarios y, si toca un endpoint o una pantalla, integración o E2E).
- [ ] `npm run lint`, `npm run format:check` y `npm run test` en verde en la carpeta tocada; backend además `npm run test:int`.
- [ ] Reglas de negocio en `domain/` (backend) o en `shared/lib` y hooks (frontend); nada de reglas en controllers ni en JSX.
- [ ] Si tocó el schema: migración versionada, seed y factories actualizados.
- [ ] Si tocó un endpoint: `backend/ARQUITECTURA.md` sección 8, Swagger y `frontend/src/api/types.ts` actualizados.
- [ ] Si tocó auth o roles: tests 401 y 403 y pasada del agente `auditor-seguridad-roles`.
- [ ] Documentación (`README`, `ARQUITECTURA`, `CONVENCIONES`) al día con lo que quedó en el código.
- [ ] Commits atómicos con el formato de `CONTRIBUTING.md`.

## Pendientes o dudas

<!-- Lo que quedó fuera a propósito, o decisiones que necesitan confirmación. -->
