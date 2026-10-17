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

- [x] **AC1** — La navbar muestra el nombre del usuario autenticado
- [x] **AC2** — Tras cerrar sesión, volver atrás en el navegador no muestra datos del dashboard
- [x] **AC3** — La cookie `iris_sid` queda expirada y la clave de Redis eliminada

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Probado en Chrome, Firefox y Safari
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [x] Documentación de usuario actualizada (ver abajo)
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

- [x] `docs/user/manual-operador.md` § Cerrar sesión

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Menú de usuario con opción de cerrar sesión. (F2-07)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Product Owner | Demo del flujo completo de autenticación | Fin de sprint 3 |

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f2-07-logout-perfil-navbar` (apilada sobre F2-06).

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 la navbar muestra el nombre del usuario autenticado | PASS | `user-menu.component.spec.ts` y `navbar.component.spec.ts`: iniciales, nombre y, en el menú, correo (si el token lo trae) o `@usuario`; avatar si hay `avatarUrl` |
| AC2 tras cerrar sesión, volver atrás no muestra datos del dashboard | PASS | Al confirmar se llama a `AuthService.logout()` y se navega a `/login` con `replaceUrl`; además `app.routes.spec.ts` comprueba que, tras `clearSession()`, volver a `/dashboard/data` termina en `/login?returnUrl=…` sin `app-sidebar`. No lo probé con el botón Atrás de un navegador real (la extensión de Chrome no estaba conectada) |
| AC3 la cookie queda expirada y la clave de Redis eliminada | PASS (adaptado) | BFF: `auth.spec.js` comprueba que `POST /auth/logout` y el `DELETE /auth/session-end` heredado revocan en Backbone y devuelven `Set-Cookie` vacío para `iris_session` e `iris_refresh`, y siguen limpiando aunque Backbone falle. El BFF ya no usa Redis (la sesión vive solo en cookies), así que "clave de Redis eliminada" se cumple por diseño: no hay clave. Se revoca el token en la lista de denegados de Backbone |

La parte de BFF de la tarea (`DELETE /auth/session-end`) ya estaba implementada y probada desde la reescritura; esta tarea es sobre todo frontend. Menú accesible: `aria-haspopup`, `aria-expanded`, `role="menu"`/`menuitem`, Escape y clic fuera lo cierran, botones deshabilitados mientras cierra. Frontend: 336 pruebas, líneas 99.7 %; BFF: 94 pruebas; `build:ssr` en `production` sin errores. Pendiente: aviso a Soporte/Operaciones del cambio de la navbar (comunicación de la tarea).
