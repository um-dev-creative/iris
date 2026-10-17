# [F3-02] Endpoints de monitoreo en el BFF

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Endpoints de monitoreo en el BFF |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | BE |
| Estimación | 3d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `backend`, `api` |
| Depende de | [F3-01](../F3-datos-reales/F3-01-contrato-api-monitoreo.md), [F2-01](../F2-autenticacion/F2-01-validar-oauth-sesion-cookie.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | Nuevo router `monitoring.routes.js` y controlador con proxy/agregación. |
| Infra / DevOps / Repo | No | — |

## Descripción

Implementar en el BFF los tres endpoints del contrato, protegidos por sesión, usando el bearer guardado en Redis para llamar a Mercury.

## Alcance

### Incluye

- Router `/mrc/api/v1/general/monitoring/*` registrado antes del proxy genérico
- Validación de query params con `ajv` según el contrato
- Mapeo Mercury → contrato; agregación de KPIs si Mercury no la provee
- Caché en Redis de 15 s para KPIs y servicios
- Errores con `traceId` del `express-http-context`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `server/routes/monitoring.routes.js` (nuevo)
- `server/controller/monitoring.controller.js` (nuevo)
- `server/app.factory.js`

## Criterios de aceptación

- [ ] **AC1** — Las respuestas validan contra `openapi.yaml`
- [ ] **AC2** — Parámetros inválidos responden 400 con detalle
- [ ] **AC3** — Sin sesión responden 401
- [ ] **AC4** — Si Mercury falla, responden 502 con `traceId`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Probado contra QA con datos reales
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
| `monitoring.controller.spec.js` | Mapeo, agregación, caché hit/miss, errores de Mercury | Unitaria |
| `monitoring.routes.spec.js` | Validación de params, 401, 400, 502, respuesta conforme al contrato | Integración + contrato |

## Documentación

### Técnica

- [ ] `docs/technical/backend.md` § Monitoreo: flujo, caché, agregaciones

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Endpoints del BFF para KPIs, mensajes y estado de servicios. (F3-02)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo Mercury | Volumen esperado de llamadas desde el BFF | Antes de desplegar en QA |
