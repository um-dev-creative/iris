# [F5-03] Logging estructurado y correlation id

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Logging estructurado y correlation id |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | should |
| Subsistema | FE + BE + Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `backend`, `observability` |
| Depende de | [F0-03](../F0-saneamiento/F0-03-unificar-entrada-servidor.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | El interceptor envía `x-request-id`. |
| Backend (BFF Node) | **Sí** | Winston en JSON con `traceId` por petición. |
| Infra / DevOps / Repo | **Sí** | Destino de logs. |

## Descripción

Para diagnosticar incidencias en QA y producción hace falta poder seguir una petición del navegador a Mercury.

## Alcance

### Incluye

- Middleware que genera o propaga `x-request-id` y lo guarda en `express-http-context`
- Formato JSON en producción con nivel, `traceId`, ruta, duración y código de estado
- Nunca registrar tokens, contraseñas ni números completos

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `server/config/app.config.js`
- `server/shared/request-id.middleware.js` (nuevo)
- `src/app/core/interceptors/*`

## Criterios de aceptación

- [ ] **AC1** — Un error en pantalla muestra un `traceId` que aparece en los logs del BFF
- [ ] **AC2** — Una búsqueda de `password` o `Bearer` en los logs no devuelve coincidencias

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

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
| `request-id.middleware.spec.js` | Generación y propagación | Unitaria |
| `logger.spec.js` | Redacción de datos sensibles | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/runbook.md` § Diagnóstico con traceId

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Identificador de seguimiento por petición en logs y mensajes de error. (F5-03)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| DevOps / Plataforma | Formato de logs para su ingesta | Antes de producción |
