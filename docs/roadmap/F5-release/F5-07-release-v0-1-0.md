# [F5-07] Publicar la versión v0.1.0

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Publicar la versión v0.1.0 |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | Infra |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `release` |
| Depende de | [F5-06](../F5-release/F5-06-uat.md), [F4-01](../F4-calidad/F4-01-smoke-e2e-playwright.md), [F4-04](../F4-calidad/F4-04-proteccion-rama-cobertura-pr.md) |
| Agentes | `manager-project` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | **Sí** | Tag, release y despliegue a producción. |

## Descripción

Cerrar el MVP con una versión trazable y comunicada.

## Alcance

### Incluye

- Mover `[Unreleased]` a `[0.1.0] - 2026-12-04` en `CHANGELOG.md`
- `package.json` → `0.1.0`
- Tag `v0.1.0` y GitHub Release con notas para usuarios
- Despliegue a producción con plan de rollback
- Comunicación de lanzamiento

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `CHANGELOG.md`
- `package.json`
- `docs/releases/v0.1.0.md` (nuevo)

## Criterios de aceptación

- [ ] **AC1** — El tag existe y la imagen desplegada corresponde a él
- [ ] **AC2** — Las release notes describen los cambios en lenguaje de usuario
- [ ] **AC3** — Los interesados recibieron la comunicación

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Retrospectiva del MVP agendada
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| Producción | Smoke post-despliegue: login, home, mensajes, logout | Smoke |

## Documentación

### Técnica

- [ ] `docs/technical/runbook.md` § Rollback

### Usuario

- [ ] `docs/releases/v0.1.0.md`: notas de versión para operadores

## CHANGELOG

Se publica la sección `[0.1.0]`.

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Todos los interesados | Anuncio de lanzamiento con release notes y enlace al manual | Día del release · correo |
| Soporte | Runbook y contactos de escalamiento | 1 día antes |
