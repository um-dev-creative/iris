# [F0-07] Backfill de pruebas del frontend existente hasta 85 %

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Backfill de pruebas del frontend existente hasta 85 % |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 3d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `testing`, `frontend`, `coverage` |
| Depende de | [F0-04](../F0-saneamiento/F0-04-ssr-localstorage-apiservice.md), [F0-06](../F0-saneamiento/F0-06-vitest-quality-gate-85.md) |
| Agentes | `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Solo se agregan specs; cambios mínimos de código si algo no es testeable. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Llevar el código Angular existente (`core`, `shared`, `layout`, `features/dashboard`) a ≥ 85 % de cobertura para que el gate pueda ser bloqueante desde F1.

## Alcance

### Incluye

- Servicios: `ThemeService`, `NotificationService`, `DashboardStore`, `ApiService`, `MonitoringDataService`
- Interceptor `httpErrorInterceptor`: retry único en 5xx, toast por código, propagación del error
- Componentes compartidos: button, badge, card, table (orden y paginación), skeleton, notification, theme-toggle
- Layout: sidebar (colapso, enlaces activos), navbar, layout
- Páginas: home, data-view (filtros, búsqueda, paginación), settings (guardar, probar conexión con `fetch` simulado)

### No incluye

- Pruebas e2e (F4-01)
- `showcase-page` puede excluirse si se oculta en producción (F5-04); documentarlo en la política

### Archivos impactados (estimado)

- `src/app/**/*.spec.ts` (nuevos)

## Criterios de aceptación

- [x] **AC1** — `pnpm test` reporta ≥ 85 % en las cuatro métricas para `src/app`
- [x] **AC2** — Ninguna spec depende del orden de ejecución ni de la hora real (usar fake timers)
- [x] **AC3** — El tiempo total de la suite es < 60 s en CI

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Gate de 85 % del frontend marcado como bloqueante en CI
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `core/**/*.spec.ts` | Servicios, guard, interceptor | Unitaria |
| `shared/**/*.spec.ts` | Inputs/outputs y render de cada componente | Componente |
| `features/dashboard/**/*.spec.ts` | Páginas y componentes de la feature | Componente |
| `layout/**/*.spec.ts` | Shell, sidebar, navbar | Componente |

## Documentación

### Técnica

- [x] `docs/technical/testing.md` § Ejemplos: un ejemplo por tipo (servicio, componente, interceptor)

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Suite de pruebas unitarias y de componentes del frontend con cobertura ≥ 85 %. (F0-07)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Product Owner / QA | El frontend existente queda cubierto; porcentaje alcanzado | Reporte semanal |

## Reporte de validación

Validado el 2026-10-17 en la rama `test/f0-07-backfill-pruebas-frontend`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `pnpm test` ≥ 85 % en las cuatro métricas | PASS | 154 pruebas en 27 archivos. Sentencias 97,83 %, ramas 97,26 %, funciones 91,05 %, líneas 98,01 %; `pnpm test` termina con código 0 |
| AC2 sin dependencia de orden ni de hora real | PASS | Suite ejecutada 3 veces con `sequence.shuffle: true`: 154/154 cada vez; el tiempo usa `vi.useFakeTimers()` |
| AC3 suite < 60 s | PASS | Vitest reporta ≈ 3 s de ejecución (≈ 15 s con el build incluido) |

Cobertura por alcance: `ThemeService`, `NotificationService`, `DashboardStore`, `ApiService`, `MonitoringDataService`; `httpErrorInterceptor` (5xx con un reintento a 1 s, toast por código, propagación); button, badge, card, table (orden, paginación), skeleton, notification, theme-toggle; sidebar (colapso, móvil, enlaces), navbar, layout; home, data-view (búsqueda, filtros, orden, paginación) y settings (guardar, restaurar, probar conexión con `fetch` simulado); más kpi-card, sparkline, chart-placeholder, service-status-card y `authGuard`. Excluidos: `showcase-page`, barrels, modelos, `main*.ts`, `environments`.

Pendiente: el gate bloqueante en CI depende de F0-09; comunicación al equipo.
