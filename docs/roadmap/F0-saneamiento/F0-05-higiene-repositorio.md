# [F0-05] Consolidar pnpm, limpiar archivos legados y reorganizar documentación

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Consolidar pnpm, limpiar archivos legados y reorganizar documentación |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | should |
| Subsistema | FE + Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `repo`, `docs`, `dx` |
| Depende de | [F0-02](../F0-saneamiento/F0-02-integrar-rama-mer-1.md) |
| Agentes | `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Se eliminan `app.module*.ts` legados. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | **Sí** | `pnpm` como único gestor; `engines` y `packageManager` en `package.json`. |

## Descripción

Conviven señales de npm y pnpm (`package-lock.json` borrado, `pnpm-lock.yaml` sin trackear, README con `npm`), hay logs y archivos temporales en la raíz y seis documentos `*_LOG.md` / `*_SUMMARY.md` dispersos.

## Alcance

### Incluye

- Trackear `pnpm-lock.yaml`; declarar `engines.node` y verificar `packageManager`
- Eliminar `tailwindcss-*.log`, `.playwright-mcp/` y `app.module*.ts`
- Mover `BACKEND_INTEGRATION_LOG.md`, `REDIS_INTEGRATION_ENHANCEMENT_LOG.md`, `CONCURRENTLY_FIX.md`, `SUCCESS_SUMMARY.md`, `HTTPS_README.md` a `docs/history/`
- Mover scripts de validación manual (`test-*.js`, `validate-*.js`, `*.sh`) a `scripts/`
- Corregir `"multer": "^2.1.1 "` (espacio sobrante) en `package.json`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `package.json`
- `pnpm-lock.yaml`
- `docs/history/*`
- `scripts/*`

## Criterios de aceptación

- [x] **AC1** — `pnpm install --frozen-lockfile` funciona en una copia limpia
- [x] **AC2** — La raíz del repo solo contiene configuración, README, CHANGELOG, AGENTS y entradas de código
- [x] **AC3** — Ningún enlace interno de la documentación queda roto

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Los scripts movidos siguen funcionando desde su nueva ruta
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI | `pnpm install --frozen-lockfile` + build | Smoke |

## Documentación

### Técnica

- [x] `docs/history/README.md` con índice de documentos históricos

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- pnpm es el único gestor de paquetes; documentación histórica reorganizada en `docs/history/`. (F0-05)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo de desarrollo | Usar solo `pnpm`; borrar `node_modules` si se instaló con npm | Al hacer merge · canal del equipo |

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f0-05-higiene-repositorio`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `pnpm install --frozen-lockfile` en copia limpia | PASS | Copia sin `.git` (`git checkout-index`): instala y `pnpm run build:dev` compila. Se detectó y corrigió que `prepare` fallaba sin `.git` |
| AC2 raíz limpia | PASS | Raíz: configuración, README, CHANGELOG, AGENTS, CLAUDE, DEVELOPMENT_SETUP, `server.js`, `server/`, `src/`, `scripts/`, `docs/` |
| AC3 enlaces internos | PASS | Revisión de enlaces relativos en todos los `.md`: solo quedan 3 preexistentes, 2 placeholders de `_TEMPLATE.md` y `docs/api/` (se crea en F2-01) |

Hecho: `pnpm-lock.yaml` y `pnpm-workspace.yaml` versionados (antes ocultos en `.git/info/exclude`), `packageManager: pnpm@12.11.2`, `engines.node` según Angular 22, `multer` sin espacio, borrados `tailwindcss-*.log` y `.playwright-mcp/`, `app.module*.ts` ya no existían, documentos a `docs/history/` (con índice), scripts a `scripts/` (ahora hacen `cd` a la raíz), eliminado `geist` de `minimumReleaseAgeExclude`. Pruebas BFF: 48/48. Pendiente: aviso al equipo de desarrollo.
