# [F1-01] Proxy de desarrollo de ng serve hacia el BFF

> Epic: [F1 · Fundaciones (IRIS-001)](../F1-fundaciones/EPIC.md) · Sprint 2 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Proxy de desarrollo de ng serve hacia el BFF |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2 |
| Etiquetas | `frontend`, `dx`, `IRIS-001` |
| Depende de | [F0-03](../F0-saneamiento/F0-03-unificar-entrada-servidor.md) |
| Agentes | `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Configuración de `ng serve`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Implementa AC1 de IRIS-001. Con `ng serve` (puerto 4200) las llamadas a `/mrc/**` y `/bkd/**` deben llegar al BFF local sin problemas de CORS.

## Alcance

### Incluye

- `proxy.conf.mjs` con contextos `/mrc`, `/bkd`, `/health`; target desde `process.env.IRIS_BFF_URL` con default `https://localhost:4001`
- `secure: false` solo en desarrollo para certificados autofirmados
- Referenciarlo en `angular.json` → `serve.options.proxyConfig`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `proxy.conf.mjs` (nuevo)
- `angular.json`

## Criterios de aceptación

- [x] **AC1** — Con BFF y `ng serve` corriendo, `GET http://localhost:4200/health` devuelve el JSON del BFF
- [x] **AC2** — No hay URLs hardcodeadas en el archivo de proxy
- [x] **AC3** — Funciona con el BFF en HTTP y en HTTPS

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Flujo documentado en README
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.


## Documentación

### Técnica

- [x] `DEVELOPMENT_SETUP.md` § Desarrollo frontend con BFF

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Proxy de desarrollo para `ng serve` hacia el BFF local. (F1-01)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo de desarrollo | Nuevo flujo `pnpm start` + BFF | Al hacer merge |

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f1-01-proxy-desarrollo-bff`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `GET :4200/health` devuelve el JSON del BFF | PASS | BFF en :4000 + `ng serve`: `curl localhost:4200/health` → `200 {"status":"UP"}` con las cabeceras del BFF (`x-trace-id`, `ratelimit-*`). `/mrc/api/v1/nope` con `x-iris-csrf: 1` → `404 {"error":"Not found"}` del BFF |
| AC2 sin URLs hardcodeadas | PASS | El destino sale de `IRIS_BFF_URL`; el único literal es el valor por defecto `http://localhost:4000`, no una URL de un entorno |
| AC3 BFF en HTTP y en HTTPS | PASS | HTTP: AC1. HTTPS: BFF con certificado autofirmado en :4001 e `IRIS_BFF_URL=https://localhost:4001` → `200 {"status":"UP"}`, sin errores en el log de `ng serve` (`secure: false`) |

Desviación: la tarea proponía `https://localhost:4001` por defecto, pero el BFF arranca en HTTP :4000 si no hay certificados (`server.js`); el default es `http://localhost:4000`. Hecho: `proxy.conf.mjs`, `angular.json` (`serve.options.proxyConfig`), `DEVELOPMENT_SETUP.md` § Desarrollo frontend con BFF, README, CLAUDE.md, AGENTS.md y CHANGELOG. Sin lógica de aplicación nueva: el gate de 85 % lo valida CI.
