# [F0-03] Unificar el punto de entrada del servidor

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Unificar el punto de entrada del servidor |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | BE + Infra |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `backend`, `architecture` |
| Depende de | [F0-02](../F0-saneamiento/F0-02-integrar-rama-mer-1.md) |
| Agentes | `repo-requirements-analyst`, `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | Fusión de `server.js` y `src/server.ts` en un único servidor. |
| Infra / DevOps / Repo | **Sí** | Scripts de `package.json` apuntan al nuevo arranque. |

## Descripción

`server.js` (CommonJS, `main` del paquete) y `src/server.ts` (SSR integrado) duplican la carga de SSL, middlewares, health checks y registro de rutas. Cualquier cambio debe hacerse dos veces y ya divergen.

## Alcance

### Incluye

- Definir `src/server.ts` como fuente de verdad (compilado por Angular)
- Extraer la creación de la app Express a `server/app.factory.js` exportando `createApp(options)` para poder probarla sin levantar puertos
- Reducir `server.js` a un lanzador: parsea flags (`yargs`), carga Vault y arranca el servidor compilado
- Actualizar scripts `server`, `serve:integrated`, `dev:integrated:*`, `start-dev:*`

### No incluye

- Cambiar el comportamiento de las rutas existentes

### Archivos impactados (estimado)

- `server.js`
- `src/server.ts`
- `server/app.factory.js` (nuevo)
- `package.json`

## Criterios de aceptación

- [ ] **AC1** — Middlewares y rutas se registran en un único lugar (`createApp`)
- [ ] **AC2** — `pnpm run serve:integrated` responde 200 en `/`, `/health` y `/health/redis`
- [ ] **AC3** — Las rutas `/mrc/api/v1/*` y `/bkd/api/v1/*` responden igual que antes (mismos códigos de estado ante la misma petición)
- [ ] **AC4** — Los flags `--vaultToken`, `--vaultUrl`, `--vaultPath`, `--debugMode`, `--ssl*` siguen funcionando

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] No queda código duplicado de SSL ni de middlewares entre archivos
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
| `server/app.factory.spec.js` | Registro de middlewares, headers de seguridad con y sin SSL, orden de rutas antes del SSR | Unitaria (Vitest + supertest) |
| `server/health.spec.js` | `/health`, `/health/redis` (disponible / no disponible), `/health/redis/reconnect` | Integración (supertest) |

## Documentación

### Técnica

- [ ] `docs/technical/architecture.md`: diagrama del arranque (lanzador → Vault → `createApp` → SSR)
- [ ] README: tabla de scripts actualizada

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- El servidor se arranca desde un único punto (`createApp`); `server.js` queda como lanzador que carga la configuración de Vault. (F0-03)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| DevOps / Plataforma | Cambia el comando de arranque si algún entorno usa `node server.js` directamente | Antes del merge · correo |
