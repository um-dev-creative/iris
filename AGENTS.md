# AGENTS

## Project Scope
- `iris` is a full-stack Angular app with integrated Node.js backend, using standalone components and lazy-loaded routes.
- **Frontend**: `src/main.ts` -> `bootstrapApplication(AppComponent, appConfig)` for client-side rendering.
- **Backend**: `server.js` + `/server` is a Node/Express BFF (pattern of `stratum` and `zerobound-frontend`) that serves the Angular build and proxies Mercury and Backbone.
- **Project Name**: Package is named `dashboard` in `package.json`; use this for Angular CLI commands.
- Root UI shell: `src/app/layout/layout.component.ts`; feature pages render inside its `router-outlet`.

## Architecture Map
- Routing is split in two levels:
  - App-level in `src/app/app.routes.ts` (`/dashboard` guarded by `authGuard`).
  - Feature-level in `src/app/features/dashboard/dashboard.routes.ts` (`home`, `data`, `settings`, `showcase`).
- Layer intent by folder:
  - `src/app/core`: cross-cutting services, guards, interceptors, models.
  - `src/app/features/dashboard`: page-specific UI + feature data service.
  - `src/app/layout`: sidebar/navbar shell.
  - `src/app/shared`: reusable UI primitives.
- Barrel exports are used heavily (`src/app/core/services/index.ts`, `src/app/shared/components/index.ts`); prefer existing barrels before deep imports.

## State, Data, and Side Effects
- App UI state is signal-first (`DashboardStore` in `src/app/core/services/dashboard-store.service.ts`).
- Theme state is centralized in `ThemeService`; it toggles `html.dark` and persists `app-theme` in `localStorage`.
- API configuration is centralized in `ApiService` and persisted as `api_config` in `localStorage`.
- HTTP flows go through `httpErrorInterceptor` (`src/app/core/interceptors/http-error.interceptor.ts`): retries one time for 5xx and emits user toasts via `NotificationService`.
- Toast UI is rendered once at shell level via `AppNotificationComponent` in `layout.component.ts`.

## UI and Styling Conventions
- Styling is Tailwind CSS v4 + design tokens in `src/styles.css` (`@theme inline` maps CSS vars to utilities).
- Dark mode relies on `.dark` class on `<html>` (`@custom-variant dark (&:is(.dark *))`), not media-query auto mode.
- Icons use `lucide-angular`; components usually expose icon constants on the class (`readonly Bell = Bell`).
- Components are standalone and mostly `ChangeDetectionStrategy.OnPush`.

## Developer Workflows
- README commands are npm-based (`README.md`), but repo declares `packageManager: pnpm@10...` and includes `pnpm-lock.yaml`.
- Use one package manager consistently per session; avoid mixing lockfile updates.
- **Project Name**: Use `dashboard` for Angular CLI commands (not `iris`); e.g., `ng build dashboard`.
- Core scripts from `package.json`:
  - `start` -> `ng serve` with `proxy.conf.mjs` to the BFF (`IRIS_BFF_URL`, default `http://localhost:4000`)
  - `build` -> `ng build --configuration=$ENVM` (uses environment variable)
  - `build:ssr` -> builds both client and SSR server
  - `serve:integrated` -> builds and serves full-stack app with backend APIs
  - `dev:integrated:unix` / `dev:integrated:win` -> watch mode with backend integration
  - `watch` -> `ng build --watch --configuration development`
  - `test` -> Vitest (`ng test`), `test:server` -> Vitest for `server/`, `test:all` -> both
- **Backend Development**: Use `serve:integrated` or `dev:integrated:*` scripts for full-stack development.
- **HTTPS Support**: the BFF serves HTTPS when `SSL_CERT_PATH` and `SSL_KEY_PATH` are set; certificates stay out of git.
- Angular schematics are configured to skip test generation (`angular.json`), and there are currently no `*.spec.ts` files.

## Integration and Environment Notes
- **Multiple Environments**: `src/environments/` holds one file per `ENVM` (`development`, `dev`, `qa`, `dev-cloud`, `qa-cloud`, `production`), all with a relative `apiBaseUrl`; see `docs/technical/environments.md`.
- API base URL is `/mrc/api/v1` in every `src/environments/environment*.ts` (relative, through the BFF); inject `API_BASE_URL`/`APP_CONFIG` instead of importing `environment`.
- **Backend Integration**: BFF in `/server` (`app.js`, `config/`, `shared/`, `routes/`, `test/`); settings come from env vars (`default.env.example`).
- **API Routes**: Backend APIs are prefixed (`/mrc/api/v1/*`, `/bkd/api/v1/*`) and don't conflict with Angular routes.
- **SSL Configuration**: Uses certificates in `/ssl` folder; falls back to HTTP if not available.
- `SettingsPageComponent` updates runtime API config through `ApiService` and does a direct `fetch` connectivity check.
- `authGuard` is currently a permissive MVP placeholder (`return true`); do not assume real auth enforcement exists.

## Safe Change Guidelines for Agents
- Keep route additions aligned with existing lazy-load split (`app.routes.ts` + `dashboard.routes.ts`).
- Put global/cross-feature concerns in `core`, feature-specific state/data in feature services.
- When adding shared UI, export it through `src/app/shared/components/index.ts` for consistency.
- Preserve signal-based patterns (`signal`, `computed`, readonly signal exposure) used across store/services.

## Backend Architecture
- **Server Entry**: `server.js` (settings check, `createApp()`, HTTP/HTTPS); the app lives in `server/app.js`.
- **Backend Modules**: CommonJS modules in `/server` folder using `require()` (not ES6 imports).
- **Configuration**: `server/config/constants.js` reads env vars with local-dev defaults; `settings-check.js` stops a half-configured production start (exit 78). No Vault, no `config` package.
- **Auth/session**: login through Backbone as the Iris application client; session and refresh JWTs in httpOnly cookies; the BFF sends the JWT upstream as `session-token` and renews it once on 401. CSRF via the `x-iris-csrf: 1` header on non-GET API calls.
- **API Routes**:
  - Mercury Standard: `/mrc/api/v1/general/*` (proxy to Mercury)
  - Mercury Auth: `/mrc/api/v1/auth/*` (access-token, logout, me, create-user, verify-code)
  - Multimedia: `/mrc/api/v1/d-image/*` (file uploads with multer)
  - Backbone: `/bkd/api/v1/*` (backbone service proxy)
- **Tests**: `pnpm test:server` (Vitest, stub upstreams, ≥ 85 %).
- **Middleware**: Rate limiting, compression, CORS (credentials), cookie-parser, W3C trace context.

## Multi-Agent Delivery Model
- The `manager-project` agent is the intake owner: receives every request, classifies scope/risk, and assigns requirements to the right agents.
- The `product-owner` agent turns the request into acceptance criteria, user-visible outcomes, and priority order.
- The `repo-requirements-analyst` agent maps requirements to concrete repo touchpoints (routes, services, shared components, env/config).
- The `developer` agent implements approved requirements using the conventions in this file (signals, standalone components, barrel exports, lazy-route split).
- The `test-writer` agent defines and/or updates validation artifacts (manual test matrix now, automated specs when introduced).

## Assignment Contract (Manager-Project)
- Input required: user request, impacted area (`core`, `features/dashboard`, `layout`, `shared`), urgency, and constraints.
- Output required: an assignment packet with numbered requirements, owner agent, dependencies, and done criteria per requirement.
- Routing rules:
  - If the request changes UX behavior or feature intent, assign to `product-owner` first.
  - If the request touches multiple folders or unclear boundaries, assign to `repo-requirements-analyst` before coding.
  - If the request is implementation-ready, assign to `developer` with explicit file targets.
  - Always assign final verification to `test-writer` before completion.

## Handoff Workflow
- `1) Intake`: `manager-project` receives request and opens a requirement list (`R1`, `R2`, ...).
- `2) Clarify`: `product-owner` refines each requirement into acceptance checks (observable in UI/API behavior).
- `3) Map`: `repo-requirements-analyst` links each requirement to files/symbols (example: `app.routes.ts` + `dashboard.routes.ts` for route work).
- `4) Build`: `developer` implements changes and reports touched files plus any barrel export updates.
- `5) Validate`: `test-writer` produces a pass/fail checklist covering build/test commands and critical runtime paths.
- `6) Close`: `manager-project` confirms all requirements passed validation, then marks request complete.

## Required Artifacts by Agent
- `manager-project`: request triage note + assignment matrix.
- `product-owner`: acceptance criteria list with priority (`must`, `should`, `could`).
- `repo-requirements-analyst`: impact map (files, risks, migration notes).
- `developer`: implementation log (changed files, rationale, follow-up tasks).
- `test-writer`: validation report including at minimum `build`, route navigation checks, and error/notification behavior checks when HTTP logic changed. For backend changes, validate API endpoints respond correctly and integrate with frontend services.
