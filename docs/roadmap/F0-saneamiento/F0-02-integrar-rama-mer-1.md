# [F0-02] Commitear por bloques e integrar la rama mer-1 en main

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Commitear por bloques e integrar la rama mer-1 en main |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE + BE + Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `repo`, `process` |
| Depende de | [F0-01](../F0-saneamiento/F0-01-remover-secretos-gitignore.md) |
| Agentes | `manager-project`, `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Se versionan SSR (`main.server.ts`, `app.config.server.ts`) y entornos nuevos. |
| Backend (BFF Node) | **Sí** | Se versiona el BFF completo (`server/`, `server.js`, `src/server.ts`). |
| Infra / DevOps / Repo | **Sí** | PR hacia `main`. |

## Descripción

La rama tiene 21 archivos modificados y ~40 sin trackear, incluido todo el BFF. El último commit (`a54ad81`) es de febrero. El trabajo debe quedar versionado en commits revisables antes de seguir.

## Alcance

### Incluye

- Commit 1 — BFF: `server/`, `server.js`, scripts `validate-*.js`, `test-*.js`
- Commit 2 — SSR: `src/server.ts`, `src/main.server.ts`, `app.config.server.ts`, `angular.json`, `tsconfig.*`, eliminación de `app.module*.ts`
- Commit 3 — Entornos y tooling: `src/environments/*`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, scripts de shell
- Commit 4 — Agentes y documentación: `AGENTS.md`, `.github/`, `docs/`
- Abrir PR a `main` con descripción por bloque y checklist de validación manual

### No incluye

- Refactors o correcciones de código (van en tareas propias)

### Archivos impactados (estimado)

- Todo el árbol modificado listado en `git status`

## Criterios de aceptación

- [ ] **AC1** — `git status` limpio salvo archivos ignorados
- [ ] **AC2** — Cada commit compila por sí solo (`pnpm run build:dev`)
- [ ] **AC3** — PR abierto con mensaje convencional (`feat:`, `chore:`, `docs:`) por commit
- [ ] **AC4** — El PR es aprobado por al menos un revisor

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] La rama `mer-1` queda mergeada o con PR aprobado esperando F0-09
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| Manual | `pnpm run build:dev` y `pnpm run serve:integrated` tras cada commit | Smoke |

## Documentación

### Técnica

- [ ] Descripción del PR con mapa de cambios por bloque

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Integración del BFF Node (proxies Mercury/Backbone, auth OAuth, sesiones Redis, SSL, health checks) con el servidor SSR de Angular. (F0-02)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Product Owner | La base técnica del BFF queda versionada y revisable | Al abrir el PR · reporte semanal |
