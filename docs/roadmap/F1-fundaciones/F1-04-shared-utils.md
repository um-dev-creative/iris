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

- [x] **AC1** — Las funciones son puras y no dependen de Angular
- [x] **AC2** — `data-view-page` usa `paginate` desde el barrel
- [x] **AC3** — No duplican lógica de `MonitoringDataService` ni `DashboardStore`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Cobertura de `shared/utils` = 100 %
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)

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

- [x] JSDoc en cada función
- [x] `docs/technical/frontend.md` § Utilidades

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Utilidades compartidas de tipos, formateo y paginación. (F1-04)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f1-04-shared-utils` (apilada sobre F1-03).

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 funciones puras sin dependencia de Angular | PASS | `grep "@angular" src/app/shared/utils/*.ts` (sin specs) → sin resultados; las pruebas son unitarias sin `TestBed` |
| AC2 `data-view-page` usa `paginate` desde el barrel | PASS | `import { paginate } from '../../../../shared/utils'`; `totalPages`, `pageStart`, `pageEnd` y `paginatedLogs` salen de un único `computed` con `paginate`. Las 17 pruebas previas de la página siguen en verde |
| AC3 sin duplicar lógica de `MonitoringDataService` ni `DashboardStore` | PASS | Ninguno contiene paginación ni formateo (`ceil`, `Intl`, `toLocale`). Solo hay dos `slice`: `monitoring-data.service.ts:117` (los 10 registros más recientes de la vista Home) y `dashboard-store.service.ts:38` (iniciales de 2 letras); ninguno es paginación por página |

Cobertura de `shared/utils` = 100 % (líneas, funciones y ramas: `type-guards` 5/5, `mappers` 9/9 y 18/18 ramas, `pagination` 16/16 y 14/14 ramas). Frontend: 223 pruebas, líneas 99.5 %. Casos límite cubiertos: página 0 y fuera de rango, total 0, tamaño de página inválido (0, negativo, fracción, NaN), fechas inválidas, locales `en-US`/`de-DE`/`es-MX` y zonas horarias. Cambio de comportamiento menor: una página actual fuera de rango ahora se ajusta en vez de mostrar una tabla vacía. `formatTimestamp` y `formatNumber` quedan disponibles para F3; hoy la tabla muestra el `timestamp` tal como llega.
