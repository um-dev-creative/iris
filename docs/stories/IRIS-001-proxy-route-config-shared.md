# [IRIS-001] Implement proxy, route, config and shared logic

| Field       | Value                                      |
|-------------|--------------------------------------------|
| **Type**    | Story                                      |
| **Priority**| High                                       |
| **Area**    | `core` · `shared` · `app.routes.ts`        |
| **Sprint**  | Sprint 1                                   |
| **Date**    | 2026-03-16                                 |

---

## Description

Establish the foundational infrastructure layer for the `iris` dashboard application by implementing four cross-cutting concerns: **dev proxy**, **route architecture**, **app config**, and **shared utilities**. This mirrors the proven patterns from `directory-frontend` and sets the baseline all feature teams depend on.

Currently the app communicates directly to `https://jsonplaceholder.typicode.com` from the browser, has a single flat `appConfig`, no environment-aware proxy, and minimal shared logic. This story closes those gaps before feature development scales.

---

## Background

`directory-frontend` solved the same cross-cutting needs with:
- A `proxy.conf.json` dev-server config that rewrites `/api/*` calls to the real backend, avoiding CORS friction.
- A layered route config with named route tokens, lazy-loaded feature modules, and a dedicated `routes/` folder.
- A typed `AppConfig` provider tree with environment-aware injection tokens.
- A `shared/utils` layer for reusable type guards, mappers, and form helpers consumed across features.

`iris` needs the same foundation to support planned integrations and multiple feature teams working in parallel.

---

## Acceptance Criteria

### AC1 — Dev Proxy

> Implementado como `proxy.conf.mjs` (no `.json`) con contextos `/mrc`, `/bkd` y `/health` hacia el BFF; el destino sale de `IRIS_BFF_URL`, no de `environment*.ts` (F1-01).
- [x] `proxy.conf.json` exists at project root and forwards `/api/**` to the configured `target` backend URL.
- [x] `angular.json` `serve` configuration references `proxyConfig: "proxy.conf.json"`.
- [x] `ng serve` no longer requires CORS workarounds for local API calls.
- [x] Proxy target is read from `environment.ts` / `environment.prod.ts` — no hardcoded URLs in proxy file.

### AC2 — Route Architecture
- [x] Route path constants are extracted to `src/app/core/routes/route-paths.ts` (e.g. `ROUTE_PATHS.DASHBOARD`, `ROUTE_PATHS.SETTINGS`).
- [x] All `routerLink` and `router.navigate()` calls in the app reference these constants, not magic strings.
- [x] `app.routes.ts` uses the new constants without breaking existing `/dashboard` redirect and lazy-load of `DASHBOARD_ROUTES`.
- [x] A wildcard `**` fallback route redirects to `ROUTE_PATHS.DASHBOARD`.
- [x] `authGuard` placeholder is preserved on the dashboard parent route.

### AC3 — App Config

> Además de los tokens, `provideAppConfig()` también se registra en `app.config.server.ts` (F1-03). La URL de la API es relativa al BFF en todos los entornos (F1-05).
- [x] Environment injection tokens are defined in `src/app/core/config/app-config.token.ts` (`APP_CONFIG`, `API_BASE_URL`).
- [x] `appConfig` in `src/app/app.config.ts` provides these tokens using `environment.*` values.
- [x] `ApiService` consumes `API_BASE_URL` token instead of importing `environment` directly.
- [x] Adding a new environment variable requires only `environment*.ts` + token update, no service changes.

### AC4 — Shared Logic
- [x] `src/app/shared/utils/` folder created with:
  - `type-guards.ts` — common `isNonNull`, `isString`, `isDefined` helpers.
  - `mappers.ts` — data-transform helpers (e.g. `toSelectOption`, `formatTimestamp`).
  - `pagination.ts` — pure functions for slice/page-count used by `PaginationState`.
- [x] `src/app/shared/utils/index.ts` barrel exports all utilities.
- [x] At least one consumer inside `features/dashboard` imports from the barrel (`src/app/shared/utils`).
- [x] No utility function duplicates existing logic in `MonitoringDataService` or `DashboardStore`.

---

## Technical Breakdown

### T1 — Proxy (estimated: 1 pt)
1. Create `proxy.conf.json` with `/api` context and `target` pointing to `environment.apiBaseUrl`.
2. Update `angular.json` `serve.options.proxyConfig`.
3. Update `environment.ts` and `environment.prod.ts` to export `apiBaseUrl` (already present — verify consistency).

### T2 — Route paths constants (estimated: 2 pts)
1. Create `src/app/core/routes/route-paths.ts` with a `ROUTE_PATHS` const object.
2. Create `src/app/core/routes/index.ts` barrel.
3. Refactor `app.routes.ts` and `dashboard.routes.ts` to use constants.
4. Refactor `sidebar.component.ts` `navItems` array to use route constants.

### T3 — Config tokens (estimated: 2 pts)
1. Create `src/app/core/config/app-config.token.ts` with `InjectionToken<string>` for `API_BASE_URL` and a typed `APP_CONFIG` token.
2. Register tokens via `provideAppConfig()` factory in `app.config.ts`.
3. Refactor `ApiService` constructor to `inject(API_BASE_URL)`.
4. Export tokens through `src/app/core/services/index.ts` or a new `src/app/core/config/index.ts` barrel.

### T4 — Shared utils (estimated: 2 pts)
1. Create `src/app/shared/utils/type-guards.ts`.
2. Create `src/app/shared/utils/mappers.ts`.
3. Create `src/app/shared/utils/pagination.ts` aligned with `PaginationState` from `dashboard.model.ts`.
4. Create `src/app/shared/utils/index.ts` barrel.
5. Replace any inline equivalents in `DataViewPageComponent` or `HomePageComponent` with imports from the barrel.

---

## Files Impacted

| File | Change |
|---|---|
| `proxy.conf.json` | **Create** |
| `angular.json` | **Update** `serve.options.proxyConfig` |
| `src/environments/environment.ts` | Verify `apiBaseUrl` field |
| `src/environments/environment.prod.ts` | Verify `apiBaseUrl` field |
| `src/app/core/routes/route-paths.ts` | **Create** |
| `src/app/core/routes/index.ts` | **Create** |
| `src/app/core/config/app-config.token.ts` | **Create** |
| `src/app/core/config/index.ts` | **Create** |
| `src/app/app.config.ts` | Add token providers |
| `src/app/app.routes.ts` | Use route constants |
| `src/app/features/dashboard/dashboard.routes.ts` | Use route constants |
| `src/app/layout/sidebar/sidebar.component.ts` | Use route constants in `navItems` |
| `src/app/core/services/api.service.ts` | Inject `API_BASE_URL` token |
| `src/app/core/services/index.ts` | Barrel update if needed |
| `src/app/shared/utils/type-guards.ts` | **Create** |
| `src/app/shared/utils/mappers.ts` | **Create** |
| `src/app/shared/utils/pagination.ts` | **Create** |
| `src/app/shared/utils/index.ts` | **Create** |

---

## Out of Scope
- Real authentication logic in `authGuard` (tracked separately).
- Server-side rendering or SSG config.
- i18n / localization setup.
- Automated test suite bootstrap (tracked separately with `test-writer`).

---

## Definition of Done
- [ ] All 4 acceptance criteria sections pass.
- [ ] `pnpm build` completes with zero errors and zero budget warnings.
- [ ] `pnpm start` resolves `/api/*` through the proxy without browser CORS errors.
- [ ] No existing route (`/dashboard`, `/dashboard/data`, `/dashboard/settings`, `/dashboard/showcase`) breaks.
- [ ] `test-writer` validation report attached with `PASS` on all baseline checks.

