# [F2-05] authGuard real y guestGuard

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | authGuard real y guestGuard |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `frontend`, `auth`, `routing` |
| Depende de | [F2-03](../F2-autenticacion/F2-03-auth-service-signals.md), [F2-04](../F2-autenticacion/F2-04-pagina-login.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Guards en `core/guards`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

`authGuard` devuelve `true` siempre. Debe proteger `/dashboard/**` y un `guestGuard` debe evitar que un usuario autenticado vea `/login`.

## Alcance

### Incluye

- `authGuard`: espera a que `status` deje de ser `unknown`; si es `anonymous` devuelve `UrlTree` a `/login?returnUrl=…`
- `guestGuard` en `/login` redirige a `/dashboard` si ya hay sesión
- En SSR, permitir render y delegar la decisión al navegador

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/core/guards/auth.guard.ts`
- `src/app/core/guards/guest.guard.ts` (nuevo)
- `src/app/app.routes.ts`

## Criterios de aceptación

- [ ] **AC1** — Abrir `/dashboard/data` sin sesión lleva a `/login?returnUrl=%2Fdashboard%2Fdata`
- [ ] **AC2** — Con sesión, `/login` redirige a `/dashboard`
- [ ] **AC3** — No hay parpadeo del dashboard antes de redirigir

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Se actualiza la nota de `AGENTS.md` que dice que el guard es permisivo
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
| `auth.guard.spec.ts` | authenticated / anonymous / unknown→resuelve / SSR | Unitaria |
| `guest.guard.spec.ts` | Ambos estados | Unitaria |

## Documentación

### Técnica

- [ ] `AGENTS.md` § Integration Notes
- [ ] `docs/technical/frontend.md` § Rutas protegidas

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Security`:

```md
- Las páginas del dashboard requieren una sesión activa. (F2-05)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
