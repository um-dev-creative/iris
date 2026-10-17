# Política de cobertura de pruebas

Objetivo: mantener **≥ 85 %** de cobertura en todo momento, en frontend y backend, durante y después del MVP.

## Umbrales

| Proyecto | Ruta | Herramienta | Líneas | Sentencias | Funciones | Ramas |
|---|---|---|---:|---:|---:|---:|
| Frontend | `src/app/**` | Vitest (`@angular/build:unit-test`) + v8 | 85 % | 85 % | 85 % | 85 % |
| Backend | `server/**` | Vitest (entorno node) + supertest + v8 | 85 % | 85 % | 85 % | 85 % |
| Diff de cada PR | archivos modificados | reporte en el PR | 85 % | — | — | — |

Los umbrales se configuran en `angular.json` / `vitest.server.config.mjs` (tarea [F0-06](F0-saneamiento/F0-06-vitest-quality-gate-85.md)). Si una métrica queda por debajo, el comando termina con error y CI bloquea el merge.

## Comandos

```bash
pnpm test            # frontend, con cobertura → coverage/frontend
pnpm test:server     # backend, con cobertura → coverage/server
pnpm test:all        # ambos
pnpm test:watch      # modo desarrollo
```

## Exclusiones permitidas

Solo se excluyen archivos sin lógica propia. Cualquier exclusión nueva se justifica en el PR y se agrega a esta tabla.

| Ruta | Motivo |
|---|---|
| `src/main.ts`, `src/main.server.ts` | Bootstrap |
| `src/server.ts`, `server.js` | Arranque del proceso; la lógica vive en `server/app.factory.js`, que sí se prueba |
| `src/environments/**` | Constantes |
| `**/index.ts` | Barrels |
| `**/*.model.ts`, `**/*.dto.ts` | Solo tipos |
| `server/config/*.json`, `*.yaml` | Configuración |
| `src/app/features/dashboard/pages/showcase-page/**` | Catálogo de componentes, deshabilitado en producción ([F5-04](F5-release/F5-04-flags-produccion.md)) |

## Transición

Hoy la cobertura es 0 % (no hay specs). El gate se activa así:

1. [F0-06](F0-saneamiento/F0-06-vitest-quality-gate-85.md) instala Vitest y los umbrales.
2. [F0-07](F0-saneamiento/F0-07-backfill-pruebas-frontend.md) y [F0-08](F0-saneamiento/F0-08-backfill-pruebas-bff.md) llevan el código existente a ≥ 85 %.
3. Al cerrar ambas, el gate pasa a ser bloqueante en CI ([F0-09](F0-saneamiento/F0-09-pipeline-ci.md)) y desde ese momento ningún PR puede bajarlo.
4. [F4-04](F4-calidad/F4-04-proteccion-rama-cobertura-pr.md) agrega el control de cobertura del diff y la protección de `main`.

Ninguna tarea de F1 en adelante se empieza hasta que el paso 3 esté cumplido.

## Buenas prácticas

- Probar comportamiento, no implementación: entradas, salidas, estado expuesto y efectos visibles.
- Cubrir ramas de error (4xx, 5xx, timeout, datos faltantes), no solo el camino feliz.
- Usar fake timers para polling, debounce y expiraciones.
- Frontend: `HttpTestingController` para HTTP y `RouterTestingHarness` para rutas.
- Backend: `supertest` sobre `createApp()`; axios, Redis y Vault siempre simulados. Una prueba que intenta salir a la red falla.
- Los fixtures de API salen del contrato `docs/api/openapi.yaml`, no se inventan en cada prueba.
