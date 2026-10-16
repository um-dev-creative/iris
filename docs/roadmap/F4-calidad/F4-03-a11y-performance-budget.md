# [F4-03] Presupuestos de accesibilidad y rendimiento

> Epic: [F4 · Calidad end-to-end](../F4-calidad/EPIC.md) · Sprint 4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Presupuestos de accesibilidad y rendimiento |
| Tipo | Task |
| Prioridad | Normal |
| MoSCoW | could |
| Subsistema | FE + Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 4 |
| Etiquetas | `a11y`, `performance`, `frontend` |
| Depende de | [F4-01](../F4-calidad/F4-01-smoke-e2e-playwright.md) |
| Agentes | `test-writer`, `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Correcciones de a11y y presupuestos en `angular.json`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | **Sí** | Lighthouse CI. |

## Descripción

El bundle inicial de desarrollo pesa 1.61 MB. Se deben fijar presupuestos y verificar accesibilidad básica.

## Alcance

### Incluye

- `budgets` en `angular.json` (inicial < 500 kB comprimido en producción)
- `@axe-core/playwright` en los escenarios e2e
- Lighthouse CI sobre `/login` y `/dashboard`: rendimiento ≥ 85, accesibilidad ≥ 95

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `angular.json`
- `e2e/*`
- `lighthouserc.json` (nuevo)

## Criterios de aceptación

- [ ] **AC1** — Sin violaciones axe de severidad *serious* o *critical*
- [ ] **AC2** — Los presupuestos fallan el build si se exceden
- [ ] **AC3** — Home carga en < 2 s (LCP) en el perfil de CI

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

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
| e2e + axe | Violaciones de accesibilidad | E2E |
| Lighthouse CI | Rendimiento y a11y | Auditoría |

## Documentación

### Técnica

- [ ] `docs/technical/testing.md` § Presupuestos

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Controles automáticos de accesibilidad y rendimiento. (F4-03)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
