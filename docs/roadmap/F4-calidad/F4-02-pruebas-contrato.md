# [F4-02] Pruebas de contrato BFF ↔ OpenAPI

> Epic: [F4 · Calidad end-to-end](../F4-calidad/EPIC.md) · Sprint 4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Pruebas de contrato BFF ↔ OpenAPI |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | should |
| Subsistema | BE + Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 4 |
| Etiquetas | `testing`, `contract`, `backend` |
| Depende de | [F3-02](../F3-datos-reales/F3-02-endpoints-bff-monitoreo.md) |
| Agentes | `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | Validación de respuestas contra el contrato. |
| Infra / DevOps / Repo | **Sí** | Paso en CI. |

## Descripción

Garantizar que el BFF no rompa el contrato que consume el frontend.

## Alcance

### Incluye

- Validar cada respuesta de las pruebas de integración contra `openapi.yaml` (p. ej. `jest-openapi`/`openapi-response-validator`)
- Detección de cambios incompatibles con `oasdiff` en PRs que tocan el contrato

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `server/test/contract/*`
- `.github/workflows/ci.yml`

## Criterios de aceptación

- [ ] **AC1** — Un campo eliminado del BFF hace fallar CI
- [ ] **AC2** — Un cambio incompatible del contrato se marca en el PR

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
| `server/test/contract/*.spec.js` | Respuestas conforme a esquema | Contrato |

## Documentación

### Técnica

- [ ] `docs/api/README.md` § Cambios de contrato

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Verificación automática del contrato de API. (F4-02)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo Mercury | Proceso para proponer cambios de contrato | Al hacer merge |
