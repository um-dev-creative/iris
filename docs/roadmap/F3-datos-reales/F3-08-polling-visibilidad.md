# [F3-08] Actualización automática por polling con pausa por visibilidad

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Actualización automática por polling con pausa por visibilidad |
| Tipo | Feature |
| Prioridad | Major |
| MoSCoW | should |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `data` |
| Depende de | [F3-04](../F3-datos-reales/F3-04-monitoring-api-service-mock-flag.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Polling en el store de monitoreo. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Los datos solo cambian con el botón de refresco. El operador necesita ver datos actualizados sin intervenir, sin sobrecargar al backend.

## Alcance

### Incluye

- Intervalo configurable `APP_CONFIG.pollingIntervalMs` (30 s por defecto)
- Pausa con la pestaña oculta (`visibilitychange`) y refresco inmediato al volver
- Backoff exponencial hasta 5 min tras errores consecutivos
- Interruptor de pausa en la UI

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `monitoring-data.service.ts`
- `navbar.component.ts` o `home-page`

## Criterios de aceptación

- [ ] **AC1** — Con la pestaña oculta no salen peticiones
- [ ] **AC2** — Tras 3 errores seguidos el intervalo crece y se informa en la UI
- [ ] **AC3** — No hay peticiones solapadas si una tarda más que el intervalo

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `monitoring-data.service.spec.ts` | Intervalo, pausa por visibilidad, backoff, no solapamiento (fake timers) | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Polling

### Usuario

- [ ] `docs/user/manual-operador.md` § Actualización automática

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Actualización automática de datos cada 30 segundos, pausada cuando la pestaña no está visible. (F3-08)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo Mercury | Carga esperada: 1 petición/30 s por operador activo | Antes de producción |
