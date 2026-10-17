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

- [ ] **AC1** — Con BFF y `ng serve` corriendo, `GET http://localhost:4200/health` devuelve el JSON del BFF
- [ ] **AC2** — No hay URLs hardcodeadas en el archivo de proxy
- [ ] **AC3** — Funciona con el BFF en HTTP y en HTTPS

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Flujo documentado en README
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.


## Documentación

### Técnica

- [ ] `DEVELOPMENT_SETUP.md` § Desarrollo frontend con BFF

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
