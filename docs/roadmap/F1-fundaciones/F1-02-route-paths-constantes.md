# [F1-02] Constantes de rutas ROUTE_PATHS

> Epic: [F1 · Fundaciones (IRIS-001)](../F1-fundaciones/EPIC.md) · Sprint 2 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Constantes de rutas ROUTE_PATHS |
| Tipo | Task |
| Prioridad | Normal |
| MoSCoW | should |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2 |
| Etiquetas | `frontend`, `routing`, `IRIS-001` |
| Depende de | [F0-07](../F0-saneamiento/F0-07-backfill-pruebas-frontend.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Rutas y navegación usan constantes. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Implementa AC2 de IRIS-001. Las rutas están como strings literales en `app.routes.ts`, `dashboard.routes.ts` y en `navItems` del sidebar.

## Alcance

### Incluye

- `src/app/core/routes/route-paths.ts` con `ROUTE_PATHS` (`as const`) y helper `routeUrl()` para rutas absolutas
- Barrel `core/routes/index.ts`
- Refactor de rutas, sidebar y cualquier `router.navigate`
- Reservar `LOGIN` para F2

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/core/routes/*` (nuevo)
- `src/app/app.routes.ts`
- `src/app/features/dashboard/dashboard.routes.ts`
- `src/app/layout/sidebar/sidebar.component.ts`

## Criterios de aceptación

- [ ] **AC1** — `grep -rn "'/dashboard" src/app` no devuelve resultados fuera de `route-paths.ts`
- [ ] **AC2** — Redirección `''` → `/dashboard` y comodín `**` siguen funcionando
- [ ] **AC3** — `authGuard` sigue aplicado a la ruta padre

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Navegación manual por las 4 páginas sin regresiones
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
| `route-paths.spec.ts` | `routeUrl()` y unicidad de rutas | Unitaria |
| `app.routes.spec.ts` | Redirecciones y lazy load con `RouterTestingHarness` | Integración |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Rutas

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- Las rutas de la aplicación se definen en constantes tipadas (`ROUTE_PATHS`). (F1-02)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
