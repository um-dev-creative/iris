# [F2-01] Validar el flujo OAuth del BFF y emitir sesión por cookie httpOnly

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Validar el flujo OAuth del BFF y emitir sesión por cookie httpOnly |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | BE + Infra |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `backend`, `auth`, `security` |
| Depende de | [F0-08](../F0-saneamiento/F0-08-backfill-pruebas-bff.md) |
| Agentes | `repo-requirements-analyst`, `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | `mercury-auth.controller` emite cookie de sesión y deja de devolver el bearer al navegador. |
| Infra / DevOps / Repo | **Sí** | Acceso a `prx-qa` para la validación. |

## Descripción

El BFF tiene `POST /mrc/api/v1/auth/access-token` y `DELETE /mrc/api/v1/auth/session-end`, pero nunca se probaron de punta a punta contra QA. Para no exponer tokens al navegador, el BFF debe guardar el bearer en Redis y entregar al cliente solo un id de sesión opaco en cookie.

## Alcance

### Incluye

- Prueba manual documentada contra `prx-qa` con un usuario de QA
- Cookie `iris_sid`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, expiración = la de la sesión de Mercury
- Middleware `requireSession` que resuelve la sesión desde Redis y la adjunta a `req`
- Respuesta de login: perfil mínimo (`id`, `name`, `email`, `expiresAt`) sin tokens
- Protección CSRF (doble envío de token o verificación de `Origin`)

### No incluye

- Refresh token silencioso (post-MVP)

### Archivos impactados (estimado)

- `server/controller/mercury-auth.controller.js`
- `server/shared/session.middleware.js` (nuevo)
- `server/shared/user-session-store.js`

## Criterios de aceptación

- [x] **AC1** — Con credenciales válidas, la respuesta incluye `Set-Cookie: iris_sid=…; HttpOnly; Secure; SameSite=Strict` y el body no contiene tokens
- [x] **AC2** — Con credenciales inválidas responde 401 con mensaje genérico
- [x] **AC3** — `requireSession` responde 401 si la cookie falta, es inválida o la sesión expiró
- [x] **AC4** — La sesión sobrevive a un reinicio del BFF cuando Redis está disponible

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Evidencia de la prueba contra QA adjunta al ticket (sin credenciales)
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `mercury-auth.controller.spec.js` | Login OK/KO, cookie, ausencia de tokens en el body | Unitaria |
| `session.middleware.spec.js` | Cookie ausente, inválida, expirada, válida | Unitaria |
| `auth.routes.spec.js` | Flujo login → petición protegida → logout | Integración (supertest) |

## Documentación

### Técnica

- [x] `docs/technical/security.md` § Sesión: diagrama de secuencia, atributos de cookie, CSRF
- [ ] `docs/api/openapi.yaml`: endpoints de auth (el archivo se crea en F3-01)

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Security`:

```md
- La sesión se entrega mediante cookie `HttpOnly` y los tokens de Mercury nunca llegan al navegador. (F2-01)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo Mercury | Confirmar el flujo de session-token y tiempos de expiración | Inicio de la tarea · reunión |
| Seguridad | Revisión del diseño de sesión y CSRF | Antes del merge |

## Riesgos y notas

- Si `prx-qa` no está disponible, bloquea toda la F2. Pedir acceso al inicio del sprint.

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f2-01-validar-oauth-sesion-cookie`.

**La tarea describe un diseño anterior** (cookie `iris_sid` con sesión en Redis, `requireSession`, `server/controller/*`). Desde la reescritura del BFF (PR #31) la sesión vive en cookies httpOnly con los JWT de Backbone (`iris_session`, `iris_refresh`) y no hay Redis. Los AC se validaron contra el diseño vigente.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `Set-Cookie` HttpOnly/Secure/SameSite=Strict y el body sin tokens | PASS | `session-cookie.spec.js` (con `COOKIE_SECURE=true`): ambas cookies con `HttpOnly; Secure; SameSite=Strict; Path=/`, `Expires` = el del refresh token, y el cuerpo solo tiene `authenticated` y `user` (ningún token). **Cambio**: `SameSite` pasó de `Lax` a `Strict` |
| AC2 credenciales inválidas → 401 genérico | PASS | Backbone 400/401/404/406 devuelven el mismo cuerpo `{"error":"Invalid credentials"}`, sin cookies |
| AC3 sesión ausente, inválida o expirada → 401 | PASS | Sin cookie: 401 sin llamar a Mercury; cookie basura o caducada: 401; sesión viva: 200. La función de `requireSession` la cumple `shared/proxy.js` (no se añadió un middleware duplicado) |
| AC4 la sesión sobrevive a un reinicio del BFF | PASS | `bff.restart()` levanta una instancia nueva: la misma cookie sigue dando 200 en `/me` y en una ruta protegida. Se cumple por diseño (sin estado en el servidor), con o sin Redis |

Pendiente: la prueba manual de punta a punta contra `prx-qa` con un usuario de QA **no la ejecuté** (no tengo acceso a ese entorno ni credenciales); las pruebas usan dobles de Backbone y Mercury. Requiere a quien tenga acceso a QA. Protección CSRF: ya existía (cabecera `x-iris-csrf`, 403 sin ella) y además `SameSite=Strict`. El perfil con `name`, `email` y `expiresAt` se hace en F2-02. BFF: 84 pruebas.
