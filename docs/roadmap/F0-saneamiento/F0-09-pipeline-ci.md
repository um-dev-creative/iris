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

- [x] **AC1** — Un PR con cobertura < 85 % falla en CI con mensaje claro
- [x] **AC2** — Un PR con un secreto de prueba falla en el paso `gitleaks`
- [x] **AC3** — El pipeline completo tarda < 10 min

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

Validado el 2026-10-17 con ejecuciones reales de GitHub Actions.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 un PR con cobertura < 85 % falla con mensaje claro | PASS | PR de prueba #40 (cerrado): el paso "Pruebas del BFF" falló con `ERROR: Coverage for lines (68.05%) does not meet global threshold (85%)` (y funciones 28,57 %, sentencias 44,83 %, ramas 47,55 %) más la anotación `::error title=BFF::…` |
| AC2 un PR con un secreto de prueba falla en gitleaks | PASS | PR de prueba #41 (cerrado): el paso "Escaneo de secretos (gitleaks)" falló con `RuleID: github-pat`, `File: ci-secret-check.txt`, `leaks found: 1`, código 1 |
| AC3 pipeline < 10 min | PASS | Run limpio del PR #38: 15 etapas en verde en 45 s (límite del job: 10 min) |

Run en verde: https://github.com/um-dev-creative/iris/actions/runs/38993456322. Los PR de prueba y sus ramas `ci-test/*` se cerraron y borraron. Pendiente: marcar el check como requerido en `main` y los avisos a equipo y DevOps.
