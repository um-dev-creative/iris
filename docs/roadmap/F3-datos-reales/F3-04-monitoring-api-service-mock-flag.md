# [F3-04] MonitoringApiService y adapter mock con feature flag

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | MonitoringApiService y adapter mock con feature flag |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `data` |
| Depende de | [F3-03](../F3-datos-reales/F3-03-dtos-mappers-frontend.md), [F1-03](../F1-fundaciones/F1-03-tokens-app-config.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Interfaz `MonitoringRepository` con dos implementaciones. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Reemplazar los datos fijos de `MonitoringDataService` sin perder la posibilidad de trabajar sin backend.

## Alcance

### Incluye

- Token `MONITORING_REPOSITORY` con implementaciones `HttpMonitoringRepository` y `MockMonitoringRepository` (datos actuales movidos a fixtures)
- Selección por `APP_CONFIG.features.mockData` (`true` solo en `development`)
- `MonitoringDataService` pasa a ser un store con signals (`kpis`, `messages`, `services`, `loading`, `error`) que consume el repositorio

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/features/dashboard/services/*`
- `src/app/features/dashboard/data/*` (nuevo)

## Criterios de aceptación

- [ ] **AC1** — En producción no se incluye el adapter mock en el bundle (verificable en el reporte de build)
- [ ] **AC2** — Cambiar el flag no requiere tocar componentes
- [ ] **AC3** — `refresh()` hace una petición real y actualiza `lastRefresh`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] El código de los arreglos fijos se elimina de `monitoring-data.service.ts`
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `http-monitoring.repository.spec.ts` | Construcción de URLs y params, mapeo | Unitaria |
| `monitoring-data.service.spec.ts` | Estados loading/error/success, refresh | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Datos: patrón repositorio y modo demo

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- El dashboard obtiene los datos de monitoreo desde el BFF; el modo demo queda disponible solo en desarrollo. (F3-04)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
