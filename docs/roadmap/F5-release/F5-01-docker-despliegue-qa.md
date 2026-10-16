# [F5-01] Imagen Docker y despliegue a QA desde CI

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Imagen Docker y despliegue a QA desde CI |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | BE + Infra |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `devops`, `docker` |
| Depende de | [F0-03](../F0-saneamiento/F0-03-unificar-entrada-servidor.md), [F1-05](../F1-fundaciones/F1-05-normalizar-entornos.md) |
| Agentes | `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | El servidor lee configuración y certificados de variables/volúmenes. |
| Infra / DevOps / Repo | **Sí** | Dockerfile, workflow de despliegue. |

## Descripción

No hay forma reproducible de desplegar. Se necesita una imagen que contenga el build SSR y el BFF y un despliegue automático a QA.

## Alcance

### Incluye

- `Dockerfile` multi-stage (pnpm build → runtime `node:22-alpine`, usuario no root)
- `HEALTHCHECK` contra `/health`
- Secretos desde Vault en arranque; certificados montados como volumen
- Workflow `deploy-qa.yml` al hacer merge en `main`
- `docker-compose.yml` local con Redis

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `.github/workflows/deploy-qa.yml`

## Criterios de aceptación

- [ ] **AC1** — `docker compose up` levanta Iris + Redis y responde en `/health`
- [ ] **AC2** — La imagen no contiene `.env`, llaves ni `node_modules` de desarrollo
- [ ] **AC3** — Merge en `main` despliega en QA sin pasos manuales

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Escaneo de vulnerabilidades de la imagen sin críticas
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI | Build de imagen + `docker run` + `curl /health` | Smoke |

## Documentación

### Técnica

- [ ] `docs/technical/ci-cd.md` § Despliegue
- [ ] `docs/technical/runbook.md`: arranque, variables, rollback

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Imagen Docker y despliegue automático al entorno de QA. (F5-01)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| DevOps / Plataforma | Requisitos de la imagen, puertos, volúmenes y secretos | Antes de la tarea · reunión |
