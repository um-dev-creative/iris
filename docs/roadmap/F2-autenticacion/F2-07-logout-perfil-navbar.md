# [F2-07] Cerrar sesión y perfil de usuario en la navbar

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Cerrar sesión y perfil de usuario en la navbar |
| Tipo | Feature |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE + BE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `frontend`, `backend`, `auth`, `ux` |
| Depende de | [F2-03](../F2-autenticacion/F2-03-auth-service-signals.md), [F2-01](../F2-autenticacion/F2-01-validar-oauth-sesion-cookie.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Menú de usuario en `navbar.component.ts`. |
| Backend (BFF Node) | **Sí** | `session-end` borra la sesión de Redis y expira la cookie. |
| Infra / DevOps / Repo | No | — |

## Descripción

La navbar muestra hoy un usuario fijo. Debe mostrar el usuario real y permitir cerrar sesión.

## Alcance

### Incluye

- Menú con nombre, email e iniciales/avatar
- Opción "Cerrar sesión" con confirmación en el propio menú
- BFF: `DELETE /auth/session-end` elimina la sesión de Redis, llama a Mercury y responde con `Set-Cookie` expirada

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/layout/navbar/navbar.component.ts`
- `server/controller/mercury-auth.controller.js`

## Criterios de aceptación

- [ ] **AC1** — La navbar muestra el nombre del usuario autenticado
- [ ] **AC2** — Tras cerrar sesión, volver atrás en el navegador no muestra datos del dashboard
- [ ] **AC3** — La cookie `iris_sid` queda expirada y la clave de Redis eliminada

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Probado en Chrome, Firefox y Safari
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `navbar.component.spec.ts` | Render del usuario, logout | Componente |
| `mercury-auth.controller.spec.js` | closeSession borra Redis y expira cookie, incluso si Mercury falla | Unitaria |

## Documentación

### Técnica

- [ ] `docs/api/openapi.yaml` § session-end

### Usuario

- [ ] `docs/user/manual-operador.md` § Cerrar sesión

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Menú de usuario con opción de cerrar sesión. (F2-07)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Product Owner | Demo del flujo completo de autenticación | Fin de sprint 3 |
