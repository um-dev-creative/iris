# [F1-04] Utilidades compartidas en shared/utils

> Epic: [F1 · Fundaciones (IRIS-001)](../F1-fundaciones/EPIC.md) · Sprint 2 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Utilidades compartidas en shared/utils |
| Tipo | Task |
| Prioridad | Normal |
| MoSCoW | should |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2 |
| Etiquetas | `frontend`, `shared`, `IRIS-001` |
| Depende de | [F0-07](../F0-saneamiento/F0-07-backfill-pruebas-frontend.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Nuevo módulo de utilidades puras. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Implementa AC4 de IRIS-001. La lógica de paginación y formateo está dentro de componentes y servicios, y se necesitará en los mappers de F3.

## Alcance

### Incluye

- `type-guards.ts`: `isDefined`, `isNonNull`, `isString`, `isRecord`
- `mappers.ts`: `formatTimestamp`, `formatNumber`, `toSelectOption`
- `pagination.ts`: `paginate`, `pageCount`, `clampPage`
- Barrel `shared/utils/index.ts`
- Usarlas en `data-view-page` reemplazando la lógica local

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/shared/utils/*` (nuevo)
- `data-view-page.component.ts`

## Criterios de aceptación

- [ ] **AC1** — Las funciones son puras y no dependen de Angular
- [ ] **AC2** — `data-view-page` usa `paginate` desde el barrel
- [ ] **AC3** — No duplican lógica de `MonitoringDataService` ni `DashboardStore`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Cobertura de `shared/utils` = 100 %
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
| `shared/utils/*.spec.ts` | Casos límite: página 0, total 0, fechas inválidas, locales | Unitaria |

## Documentación

### Técnica

- [ ] JSDoc en cada función
- [ ] `docs/technical/frontend.md` § Utilidades

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Utilidades compartidas de tipos, formateo y paginación. (F1-04)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
