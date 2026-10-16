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

- [ ] **AC1** — `pnpm install --frozen-lockfile` funciona en una copia limpia
- [ ] **AC2** — La raíz del repo solo contiene configuración, README, CHANGELOG, AGENTS y entradas de código
- [ ] **AC3** — Ningún enlace interno de la documentación queda roto

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Los scripts movidos siguen funcionando desde su nueva ruta
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI | `pnpm install --frozen-lockfile` + build | Smoke |

## Documentación

### Técnica

- [ ] `docs/history/README.md` con índice de documentos históricos

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
