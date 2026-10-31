# [F2-03] AuthService con signals

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | AuthService con signals |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `frontend`, `auth` |
| Depende de | [F1-03](../F1-fundaciones/F1-03-tokens-app-config.md), [F2-02](../F2-autenticacion/F2-02-endpoint-sesion-actual.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Nuevo servicio en `core/services`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Servicio central de autenticación siguiendo el patrón signal-first del proyecto (`DashboardStore`).

## Alcance

### Incluye

- Signals de solo lectura: `user`, `isAuthenticated`, `status` (`unknown` | `authenticated` | `anonymous`)
- Métodos `login(credentials)`, `logout()`, `restoreSession()` (llama a `/auth/me`)
- `provideAppInitializer` que ejecuta `restoreSession()` solo en navegador
- `withCredentials: true` en las llamadas al BFF
- Exportar por el barrel `core/services/index.ts`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/core/services/auth.service.ts` (nuevo)
- `src/app/core/models/user.model.ts`
- `src/app/app.config.ts`

## Criterios de aceptación

- [x] **AC1** — Tras `login` exitoso, `isAuthenticated()` es `true` y `user()` tiene el perfil
- [x] **AC2** — Tras `logout`, el estado vuelve a `anonymous` aunque el BFF falle
- [x] **AC3** — Al recargar con sesión válida, el estado se restaura sin pasar por el login
- [x] **AC4** — En SSR el estado queda `unknown` y no se hacen llamadas

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Modelo `User` alineado con la respuesta de `/auth/me` (se elimina el modelo de jsonplaceholder)
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `auth.service.spec.ts` | login OK/KO, logout con y sin error, restore 200/401, SSR | Unitaria (`HttpTestingController`) |

## Documentación

### Técnica

- [x] `docs/technical/frontend.md` § Autenticación: estados y transiciones

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Servicio de autenticación con estado de sesión reactivo. (F2-03)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f2-03-auth-service-signals` (apilada sobre F2-02).

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 tras `login`, `isAuthenticated()` es `true` y `user()` tiene el perfil | PASS | `auth.service.spec.ts` "login": POST a `/auth/access-token` con cookies y `x-iris-csrf`; estado `authenticated` y `user()` igual al perfil. Credenciales inválidas: la promesa se rechaza (401) y el estado no cambia |
| AC2 tras `logout`, el estado es `anonymous` aunque el BFF falle | PASS | Pruebas con 204, con 500 y con error de red: la promesa se resuelve y el estado es `anonymous` |
| AC3 al recargar con sesión válida el estado se restaura sin pasar por el login | PASS | `restoreSession()` hace `GET /auth/me` con cookies: `authenticated` con el perfil; 401 o BFF caído → `anonymous`; llamadas simultáneas comparten una petición. Registrado con `provideAppInitializer` en `app.config.ts` |
| AC4 en SSR el estado queda `unknown` y no se hacen llamadas | PASS | Prueba con `PLATFORM_ID = 'server'`: `http.expectNone`, estado `unknown`. Además `app.config.server.ts` no registra el inicializador |

`AuthService` 32/32 líneas y 9/9 ramas. Frontend: 257 pruebas, líneas 99.7 %; `build:ssr` en `development` y `production` sin errores. Hecho: modelos `User` (perfil del BFF, sustituye al de ejemplo), `LoginCredentials` y `AuthStatus`; `DashboardStore.user` ahora sale de `AuthService` (se eliminó `setUser`) y se quitó el usuario simulado de `AppComponent`; `fakeAuth()` para las pruebas (excluido de la cobertura y del build de la app). No cubierto por pruebas: la línea de `app.config.ts` que registra el inicializador (no se importa en las pruebas); se verificará en el flujo completo de F2-04/F2-05. Nota: mientras no llegue F2-06, un 401 del login lo muestra también el interceptor de errores como aviso "No autorizado".
