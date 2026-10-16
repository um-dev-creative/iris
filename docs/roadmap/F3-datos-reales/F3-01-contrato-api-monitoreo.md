# [F3-01] Contrato de API de monitoreo (OpenAPI)

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Contrato de API de monitoreo (OpenAPI) |
| Tipo | Task |
| Prioridad | Show-stopper |
| MoSCoW | must |
| Subsistema | FE + BE |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `api`, `contract`, `backend`, `frontend` |
| Depende de | — |
| Agentes | `product-owner`, `repo-requirements-analyst` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Define los DTO que consumirá el frontend. |
| Backend (BFF Node) | **Sí** | Define los endpoints que expondrá el BFF. |
| Infra / DevOps / Repo | No | — |

## Descripción

No hay contrato para los datos de monitoreo. Sin él, F3 no puede avanzar en paralelo entre frontend y backend. Es la dependencia externa más riesgosa del MVP (equipo Mercury).

## Alcance

### Incluye

- `docs/api/openapi.yaml` con: `GET /mrc/api/v1/general/monitoring/kpis?window=24h`, `GET …/monitoring/messages` (filtros `status`, `provider`, `q`, `from`, `to`, `page`, `pageSize`, `sort`), `GET …/monitoring/services`
- Esquemas de error comunes (`code`, `message`, `traceId`)
- Mapeo de cada campo con su origen en Mercury o indicación de que se agrega en el BFF
- Ejemplos de respuesta usados luego como fixtures

### No incluye

- Implementación

### Archivos impactados (estimado)

- `docs/api/openapi.yaml` (nuevo)
- `docs/api/README.md`

## Criterios de aceptación

- [ ] **AC1** — El contrato valida con `@redocly/cli lint`
- [ ] **AC2** — Equipo Mercury y Product Owner aprueban el documento por escrito
- [ ] **AC3** — Cada KPI de la home tiene definición de cálculo y ventana de tiempo

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Fixtures de ejemplo en `server/test/fixtures/monitoring/`
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI | `redocly lint docs/api/openapi.yaml` | Validación de contrato |

## Documentación

### Técnica

- [ ] `docs/api/openapi.yaml`
- [ ] `docs/api/README.md`: cómo versionar el contrato

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Contrato OpenAPI de los endpoints de monitoreo. (F3-01)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo Mercury | Revisión y aprobación del contrato; fecha de disponibilidad de endpoints | Semana del 26 oct · reunión |
| Product Owner | Aprobación de definiciones de KPI | Misma reunión |

## Riesgos y notas

- Si Mercury no expone agregados, el BFF los calcula (F3-02) y aumenta su estimación.
