# [F0-08] Backfill de pruebas del BFF hasta 85 %

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Backfill de pruebas del BFF hasta 85 % |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | BE |
| Estimación | 4d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `testing`, `backend`, `coverage` |
| Depende de | [F0-03](../F0-saneamiento/F0-03-unificar-entrada-servidor.md), [F0-06](../F0-saneamiento/F0-06-vitest-quality-gate-85.md) |
| Agentes | `test-writer`, `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | Specs para controladores, proxies y módulos compartidos; inyección de dependencias donde sea necesario para poder simular axios y Redis. |
| Infra / DevOps / Repo | No | — |

## Descripción

El BFF (`server/`) no tiene pruebas automatizadas, solo scripts de validación manual. Incluye lógica sensible: OAuth, cifrado con CryptoJS, validación de dominios, sesiones y locks en Redis.

## Alcance

### Incluye

- `shared/common-function.js`, `error-util.js`, `oauth-common-function.js`
- `shared/redis-client.js`, `redis-lock.js`, `redis-session-store.js`, `user-session-store.js` (Redis simulado y fallback en memoria)
- `proxy/oauth-client.js`, `proxy/backbone-client.js` (axios simulado: éxito, 4xx, 5xx, timeout)
- Controladores: auth (lista blanca de dominios, cierre de sesión), std, register, create-user, multimedia (tipos y tamaño de archivo), backbone
- Rutas: cada router responde por supertest con controladores simulados

### No incluye

- Llamadas reales a Mercury, Backbone o Vault

### Archivos impactados (estimado)

- `server/**/*.spec.js` (nuevos)
- `server/test/fixtures/*` (respuestas simuladas)

## Criterios de aceptación

- [ ] **AC1** — `pnpm test:server` reporta ≥ 85 % en las cuatro métricas para `server/`
- [ ] **AC2** — La validación de dominios rechaza hosts fuera de la lista (`domainsList`) con prueba explícita
- [ ] **AC3** — Ninguna prueba abre conexiones de red reales (falla si se intenta)

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Gate de 85 % del backend marcado como bloqueante en CI
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
| `server/shared/*.spec.js` | Utilidades, Redis, locks, sesiones | Unitaria |
| `server/proxy/*.spec.js` | Clientes HTTP con axios simulado | Unitaria |
| `server/controller/*.spec.js` | Lógica de cada controlador | Unitaria |
| `server/routes/*.spec.js` | Ruteo y middlewares (multer, JSON) | Integración (supertest) |

## Documentación

### Técnica

- [ ] `docs/technical/backend.md` § Pruebas: cómo simular Mercury, Redis y Vault

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Suite de pruebas del BFF (controladores, proxies, sesiones Redis) con cobertura ≥ 85 %. (F0-08)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Seguridad | Pruebas que cubren validación de dominios y manejo de tokens | Al cerrar la tarea |
