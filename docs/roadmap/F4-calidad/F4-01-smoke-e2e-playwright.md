# [F4-01] Smoke e2e con Playwright

> Epic: [F4 · Calidad end-to-end](../F4-calidad/EPIC.md) · Sprint 4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Smoke e2e con Playwright |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE + BE + Infra |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 4 |
| Etiquetas | `testing`, `e2e` |
| Depende de | [F2-07](../F2-autenticacion/F2-07-logout-perfil-navbar.md), [F3-06](../F3-datos-reales/F3-06-logs-filtros-paginacion.md), [F0-09](../F0-saneamiento/F0-09-pipeline-ci.md) |
| Agentes | `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Atributos `data-testid` donde haga falta. |
| Backend (BFF Node) | **Sí** | Modo de pruebas con Mercury simulado (`MOCK_UPSTREAM=true`). |
| Infra / DevOps / Repo | **Sí** | Job e2e en CI. |

## Descripción

Las pruebas unitarias no verifican que SSR, BFF y frontend funcionen juntos. Se necesita un recorrido crítico automatizado.

## Alcance

### Incluye

- Escenarios: login OK → home con KPIs → mensajes filtrados → logout; login fallido; sesión expirada
- Servidor Mercury simulado (fixtures del contrato) para CI
- Ejecución en Chromium en CI; Firefox y WebKit en ejecución nocturna
- Trazas y capturas como artefactos ante fallo

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `e2e/**` (nuevo)
- `playwright.config.ts`
- `.github/workflows/ci.yml`

## Criterios de aceptación

- [ ] **AC1** — Los 3 escenarios pasan en CI en < 5 min
- [ ] **AC2** — Un fallo adjunta traza de Playwright
- [ ] **AC3** — Las pruebas no dependen de datos de QA

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Job e2e requerido para merge
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `e2e/*.spec.ts` | Recorrido crítico | E2E |

## Documentación

### Técnica

- [ ] `docs/technical/testing.md` § E2E: cómo ejecutarlas localmente

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Pruebas end-to-end del recorrido principal. (F4-01)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| QA | Escenarios automatizados para no repetir manualmente | Al hacer merge |
