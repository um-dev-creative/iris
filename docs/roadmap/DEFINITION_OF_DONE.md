# Definition of Done (general)

Aplica a todas las tareas del backlog del MVP. Cada tarea agrega además sus puntos específicos.

## Código

- [ ] Sigue las convenciones de `AGENTS.md`: componentes standalone + `OnPush`, estado con signals expuestos como readonly, barrels actualizados, rutas lazy en `app.routes.ts` / `dashboard.routes.ts`, backend en CommonJS.
- [ ] No hay secretos, tokens, URLs de entornos ni datos personales en el código o en los logs.
- [ ] Acceso a APIs del navegador (`window`, `document`, `localStorage`) protegido para SSR.
- [ ] `pnpm run build:ssr` sin errores ni warnings nuevos.

## Pruebas y cobertura

- [ ] Pruebas nuevas o actualizadas para todo el código agregado o modificado.
- [ ] Cobertura global **≥ 85 %** en líneas, sentencias, funciones y ramas en `src/app` y en `server/` ([política](COVERAGE_POLICY.md)).
- [ ] Cobertura del diff del PR **≥ 85 %**.
- [ ] CI en verde (build, pruebas, cobertura, escaneo de secretos y, desde F4, e2e).
- [ ] `test-writer` entregó el reporte de validación con `PASS` en cada criterio de aceptación.

## Revisión

- [ ] PR con la plantilla completa y enlace al ticket de YouTrack.
- [ ] Al menos una aprobación; dos si toca `server/controller`, `server/shared` o `src/app/core`.
- [ ] Capturas en tema claro y oscuro si hay cambios visuales.

## Documentación y comunicación

- [ ] Entrada en `CHANGELOG.md` bajo `[Unreleased]`, con el ID de la tarea.
- [ ] Documentación técnica actualizada en `docs/technical/` o `docs/api/` cuando cambie arquitectura, configuración, API o forma de ejecutar.
- [ ] Documentación de usuario actualizada en `docs/user/` cuando cambie algo visible para el operador.
- [ ] Comunicación enviada a los interesados indicados en la tarea ([matriz](STAKEHOLDERS.md)).

## Cierre

- [ ] Desplegado y verificado en el entorno `dev` (o `qa` desde F5).
- [ ] Ticket de YouTrack movido a *Done* con enlace al PR y al reporte de validación.
