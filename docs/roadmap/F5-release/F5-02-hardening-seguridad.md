# [F5-02] Hardening de seguridad por entorno

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Hardening de seguridad por entorno |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE + BE + Infra |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `security`, `backend` |
| Depende de | [F0-03](../F0-saneamiento/F0-03-unificar-entrada-servidor.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Eliminar estilos/scripts que requieran `unsafe-eval`. |
| Backend (BFF Node) | **Sí** | CSP, CORS, TLS, rate limit y `allowedHosts` configurables por entorno. |
| Infra / DevOps / Repo | **Sí** | Valores por entorno en `server/config`. |

## Descripción

La configuración actual es de desarrollo: `NODE_TLS_REJECT_UNAUTHORIZED=0`, CSP con `'unsafe-eval'`, `cors()` abierto, rate limit de 10 000 req/15 min y `allowedHosts` limitado a localhost.

## Alcance

### Incluye

- CSP con nonce de Angular y sin `unsafe-eval` en producción
- CORS con lista blanca por entorno
- TLS estricto fuera de `dev`; sin `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Rate limit por entorno y más estricto en `/auth/access-token` (p. ej. 10/min por IP)
- `allowedHosts` del `CommonEngine` desde configuración
- `helmet` en lugar de headers manuales

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `server/app.factory.js`
- `src/server.ts`
- `server/config/*.json`

## Criterios de aceptación

- [ ] **AC1** — En producción, los headers pasan en securityheaders.com con nota ≥ A
- [ ] **AC2** — Un origen no permitido recibe error CORS
- [ ] **AC3** — 11 intentos de login en un minuto devuelven 429
- [ ] **AC4** — El render SSR funciona con el dominio real

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Revisión del equipo de Seguridad
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
| `app.factory.spec.js` | Headers por entorno, CORS permitido/denegado, rate limit de login | Integración (supertest) |

## Documentación

### Técnica

- [ ] `docs/technical/security.md`: matriz de controles por entorno

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Security`:

```md
- Políticas de seguridad (CSP, CORS, TLS, límites de peticiones) ajustadas por entorno. (F5-02)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Seguridad | Matriz de controles para aprobación | Antes del merge |
| DevOps / Plataforma | Dominios y orígenes por entorno | Antes del merge |
