# [F4-04] Protección de main y reporte de cobertura en PR

> Epic: [F4 · Calidad end-to-end](../F4-calidad/EPIC.md) · Sprint 4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Protección de main y reporte de cobertura en PR |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | Infra |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 4 |
| Etiquetas | `repo`, `process`, `coverage` |
| Depende de | [F0-09](../F0-saneamiento/F0-09-pipeline-ci.md) |
| Agentes | `manager-project` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | **Sí** | Reglas de GitHub. |

## Descripción

Asegurar que el umbral de 85 % y los checks no se puedan saltar.

## Alcance

### Incluye

- Branch protection en `main`: CI y e2e requeridos, 1 aprobación, sin push directo
- Comentario automático en el PR con cobertura total y del diff (≥ 85 % en líneas nuevas)
- CODEOWNERS: `server/` y `src/app/core` requieren revisión

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `.github/CODEOWNERS` (nuevo)
- `.github/workflows/ci.yml`

## Criterios de aceptación

- [ ] **AC1** — Un push directo a `main` es rechazado
- [ ] **AC2** — Cada PR muestra la cobertura del diff
- [ ] **AC3** — Un PR con cobertura del diff < 85 % no se puede mergear

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.


## Documentación

### Técnica

- [ ] `CONTRIBUTING.md` § Reglas de merge

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- La rama principal está protegida y cada PR informa su cobertura. (F4-04)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo de desarrollo | Nuevas reglas de merge | Al activarse |
