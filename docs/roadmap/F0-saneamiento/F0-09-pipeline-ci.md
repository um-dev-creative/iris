# [F0-09] Pipeline de CI con build SSR, pruebas y cobertura

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Pipeline de CI con build SSR, pruebas y cobertura |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `ci`, `devops` |
| Depende de | [F0-06](../F0-saneamiento/F0-06-vitest-quality-gate-85.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | **Sí** | Workflow de GitHub Actions. |

## Descripción

No existe integración continua. Se necesita un pipeline que ejecute en cada PR la instalación, el build SSR y las pruebas con el gate de cobertura.

## Alcance

### Incluye

- `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile` → `ng build` (production) + server → `pnpm test` → `pnpm test:server` → `gitleaks`
- Caché de pnpm store
- Publicar `coverage/` como artefacto y resumen de cobertura en el job summary
- Ejecutar en `pull_request` y `push` a `main`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `.github/workflows/ci.yml` (nuevo)

## Criterios de aceptación

- [ ] **AC1** — Un PR con cobertura < 85 % falla en CI con mensaje claro
- [ ] **AC2** — Un PR con un secreto de prueba falla en el paso `gitleaks`
- [ ] **AC3** — El pipeline completo tarda < 10 min

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Badge de CI en el README
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI | PR de prueba que baja la cobertura → debe fallar | Verificación del pipeline |

## Documentación

### Técnica

- [x] `docs/technical/ci-cd.md`: etapas, tiempos, cómo reproducir localmente

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Integración continua en GitHub Actions con build SSR, pruebas, cobertura mínima del 85 % y escaneo de secretos. (F0-09)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo de desarrollo | Los PR requieren CI en verde | Al hacer merge |
| DevOps / Plataforma | Existencia del pipeline y artefactos | Al hacer merge |

## Reporte de validación

Validado el 2026-10-17 en la rama `ci/f0-09-pipeline-ci`. **GitHub Actions no se puede ejecutar desde aquí**: el workflow se validó con `actionlint` (sin errores) y cada etapa se reprodujo en local; falta confirmar el primer run real en el PR.

| Criterio | Resultado | Evidencia local |
|---|---|---|
| AC1 un PR con cobertura < 85 % falla con mensaje claro | PARCIAL | `pnpm vitest … --coverage.thresholds.lines=100` termina con código ≠ 0 y `ERROR: Coverage for lines (99.24%) does not meet global threshold (100%)`; el workflow añade `::error::`. Falta el PR de prueba que baje la cobertura |
| AC2 un PR con un secreto falla en gitleaks | PARCIAL | Repo temporal con un token `ghp_…` falso: `gitleaks detect --config .gitleaks.toml` → `leaks found: 1`, código 1. Falta verlo en Actions |
| AC3 pipeline < 10 min | PARCIAL | Copia limpia del repo: install `--frozen-lockfile` + `build:ssr` + ambas suites en 27 s; el job tiene `timeout-minutes: 10` |

Hecho: `.github/workflows/ci.yml` (pnpm con caché, Node 24, `fetch-depth: 0`, artefacto `coverage`, resumen en el job summary vía `scripts/coverage-summary.mjs`, gitleaks 8.30.1 por binario para no depender de licencia), badge en el README, `docs/technical/ci-cd.md`. Pendiente: primer run en GitHub, marcar el check como requerido en `main`, y los avisos a equipo y DevOps.
