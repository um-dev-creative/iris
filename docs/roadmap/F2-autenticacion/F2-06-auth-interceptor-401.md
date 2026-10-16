# [F2-06] Interceptor de autenticación y manejo de sesión expirada

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Interceptor de autenticación y manejo de sesión expirada |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `frontend`, `auth`, `http` |
| Depende de | [F2-03](../F2-autenticacion/F2-03-auth-service-signals.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Nuevo `authInterceptor` y ajuste de `httpErrorInterceptor`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Toda llamada al BFF debe enviar la cookie y, si la sesión expiró, el usuario debe ser llevado al login con un aviso, una sola vez aunque fallen varias peticiones en paralelo.

## Alcance

### Incluye

- `authInterceptor`: `withCredentials` para URLs del BFF y header CSRF
- Ante 401 (excepto en `/auth/access-token`): limpiar estado, toast "Tu sesión expiró" y navegar a `/login?returnUrl`
- Deduplicar: varios 401 simultáneos generan un solo toast y una sola navegación
- Orden de interceptores documentado: auth → error

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/core/interceptors/auth.interceptor.ts` (nuevo)
- `src/app/core/interceptors/http-error.interceptor.ts`
- `src/app/app.config.ts`

## Criterios de aceptación

- [ ] **AC1** — Con la sesión invalidada en Redis, la siguiente acción muestra un solo aviso y lleva al login
- [ ] **AC2** — El 401 del login no dispara la redirección
- [ ] **AC3** — El retry de 5xx existente sigue funcionando

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Prueba manual: borrar la sesión en Redis y navegar
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `auth.interceptor.spec.ts` | withCredentials, CSRF, 401 único y múltiple, exclusión del login | Unitaria |
| `http-error.interceptor.spec.ts` | Regresión del retry 5xx | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § HTTP: cadena de interceptores

### Usuario

- [ ] `docs/user/manual-operador.md` § Sesión expirada

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Aviso y redirección automática al login cuando la sesión expira. (F2-06)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
