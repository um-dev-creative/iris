# [F3-03] DTOs y mappers de monitoreo en el frontend

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | DTOs y mappers de monitoreo en el frontend |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `models` |
| Depende de | [F3-01](../F3-datos-reales/F3-01-contrato-api-monitoreo.md), [F1-04](../F1-fundaciones/F1-04-shared-utils.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Modelos DTO y funciones de mapeo en `features/dashboard`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Separar la forma de los datos del API (DTO) del modelo de la UI (`MonitoringKpi`, `LogEntry`, `ServiceStatus`), que hoy incluye detalles visuales como íconos y clases CSS.

## Alcance

### Incluye

- `models/monitoring.dto.ts` generado o escrito desde el contrato
- `mappers/monitoring.mapper.ts`: DTO → modelo de UI, asignando íconos y colores según el tipo
- Uso de `shared/utils` para formateo

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/features/dashboard/models/monitoring.dto.ts` (nuevo)
- `src/app/features/dashboard/mappers/*` (nuevo)
- `monitoring.model.ts`

## Criterios de aceptación

- [ ] **AC1** — Los modelos de UI no se construyen a mano en ningún servicio
- [ ] **AC2** — Campos opcionales ausentes no rompen el render
- [ ] **AC3** — Un proveedor o estado desconocido se muestra como "Otro" en vez de fallar

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Cobertura de mappers = 100 %
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
| `monitoring.mapper.spec.ts` | Con los fixtures del contrato, campos faltantes, valores desconocidos | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Modelos y mappers

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Modelos de transferencia y mapeo de datos de monitoreo. (F3-03)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
