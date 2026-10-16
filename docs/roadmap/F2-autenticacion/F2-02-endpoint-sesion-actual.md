# [F2-02] Endpoint de sesión actual GET /mrc/api/v1/auth/me

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Endpoint de sesión actual GET /mrc/api/v1/auth/me |
| Tipo | Feature |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | BE |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `backend`, `auth` |
| Depende de | [F2-01](../F2-autenticacion/F2-01-validar-oauth-sesion-cookie.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | Nuevo endpoint protegido. |
| Infra / DevOps / Repo | No | — |

## Descripción

Al recargar la página, el frontend necesita saber si hay sesión y quién es el usuario sin volver a pedir credenciales.

## Alcance

### Incluye

- `GET /mrc/api/v1/auth/me` protegido por `requireSession`
- Devuelve `{ id, name, email, avatarUrl?, expiresAt }`
- Header `Cache-Control: no-store`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `server/routes/mercury-auth.routes.js`
- `server/controller/mercury-auth.controller.js`

## Criterios de aceptación

- [ ] **AC1** — Con sesión válida responde 200 con el perfil
- [ ] **AC2** — Sin sesión responde 401
- [ ] **AC3** — La respuesta no se cachea

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Documentado en OpenAPI
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `auth.routes.spec.js` | 200 / 401 / no-store | Integración (supertest) |

## Documentación

### Técnica

- [ ] `docs/api/openapi.yaml`

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Endpoint `GET /mrc/api/v1/auth/me` para consultar la sesión actual. (F2-02)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
