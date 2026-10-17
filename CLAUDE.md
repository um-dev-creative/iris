# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `AGENTS.md` for the detailed conventions and the multi-agent delivery model (manager-project → product-owner → repo-requirements-analyst → developer → test-writer). The essentials are below.

## Overview

`iris` is an Angular 22 monitoring dashboard (standalone components, signals, Tailwind CSS v4, `lucide-angular`) served by a Node/Express BFF. The Angular CLI project and npm package are both named **`dashboard`** (use `ng build dashboard`, not `iris`). The README is in Spanish and minimal.

## Commands

The repo declares `packageManager: pnpm` (`pnpm-lock.yaml`); use pnpm and don't mix lockfiles.

- `pnpm start`: `ng serve` on :4200; `proxy.conf.mjs` forwards `/mrc`, `/bkd` and `/health` to the BFF (`IRIS_BFF_URL`, default `http://localhost:4000`), so run `pnpm server` alongside.
- `pnpm build:dev`: development build. `pnpm build` and `pnpm build:ssr` need `ENVM` set (`development`, `dev`, `qa`, `dev-cloud`, `qa-cloud`, `production`; each maps to an `angular.json` configuration and a `src/environments/environment.*.ts`, see `docs/technical/environments.md`).
- `pnpm serve:integrated`: SSR build and then `node server.js` (full stack; HTTPS only when `SSL_CERT_PATH` and `SSL_KEY_PATH` are set).
- `pnpm dev:integrated:unix`: watches the SSR build and runs `node server.js`.
- `pnpm test`: Vitest via `@angular/build:unit-test`, with 85 % coverage thresholds (frontend stays below until F0-07). Single spec: `pnpm ng test --no-watch --include='src/app/path/to/x.spec.ts'`.
- No lint script is configured.
- `pnpm test:server`: BFF tests (Vitest, stub backbone and mercury, no network), fails under 85 %. One file: `pnpm vitest run --config vitest.server.config.mjs server/test/proxy.spec.js`. `pnpm test:all` runs both projects; `docs/technical/testing.md` has the details.
- BFF settings are env vars read at require time by `server/config/constants.js` (loaded from `.env`/`default.env` by dotenv); see `default.env.example`. In `NODE_ENV=production` the BFF exits with code 78 if the Backbone client settings are missing.

## Architecture

Two cooperating halves:

**Frontend (`src/app`)**
- `src/main.ts` bootstraps `AppComponent`. Routing is two-level and lazy: `app.routes.ts` (`/dashboard`, guarded by `authGuard`) and `features/dashboard/dashboard.routes.ts` (`home`, `data`, `settings`, `showcase`). Keep new routes aligned with this split.
- `core/` holds cross-cutting services, guards, interceptors and models. `features/dashboard/` holds pages and their feature services. `layout/` is the shell: sidebar and navbar, with pages rendered in its `router-outlet`. `shared/` holds reusable UI.
- Barrels are used heavily (`core/services/index.ts`, `shared/components/index.ts`). Import through them, and export new shared components through the barrel.
- State is signal-first: `DashboardStore` is the UI state; `ThemeService` toggles `html.dark` and persists `app-theme`; `ApiService` holds the runtime API base config persisted as `api_config` in `localStorage`.
- `httpErrorInterceptor` retries 5xx once and emits toasts through `NotificationService`. The toast UI renders once, in the layout shell.
- Dark mode is the `.dark` class on `<html>` (`@custom-variant dark`), not `prefers-color-scheme`. Design tokens live in `src/styles.css` (`@theme inline`).
- Auth: `AuthService` (signals `user`/`status`/`isAuthenticated`, restored at startup via `GET /auth/me`) is the source of the session; `authGuard` (on `canActivate` and `canActivateChild` of `/dashboard`) sends anonymous visitors to `/login?returnUrl=…`, `guestGuard` guards `/login`. `authInterceptor` (before `httpErrorInterceptor`) adds cookies and the CSRF header to BFF calls and turns a 401 into one "session expired" notice plus a redirect to login. See `docs/technical/frontend.md` and `security.md`.

**Backend (`server.js` + `server/`)**: the BFF follows the same pattern as `stratum` and `zerobound-frontend`.
- `server.js` is only the entry: dotenv, `settings-check` (exit 78 on a bad configuration), `createApp()` from `server/app.js`, optional HTTPS. `createApp({distPath})` has no side effects, which is what the tests rely on.
- `server/` is plain CommonJS: `config/` (constants, logger, settings-check), `shared/` (proxy, backbone client, session cookies, csrf, trace, upload), `routes/`, `test/`.
- Auth is cookie-based and stateless: login goes to backbone as the Iris application client (M2M token, cached and renewed), the session and refresh JWTs live in httpOnly cookies `iris_session` / `iris_refresh`, and the BFF forwards the JWT as the `session-token` header. `shared/proxy.js` renews it once on a 401. There is no Redis and no Vault.
- Every API call under `/mrc/api/v1` and `/bkd/api/v1` needs the `x-iris-csrf: 1` header unless it is a GET; an unknown API path is a 404 JSON, never the SPA.
- Routes: `/mrc/api/v1/auth/*` (login `access-token`, `logout`, legacy `session-end`, `me`, and public `create-user` / `verify-code`), `/mrc/api/v1/general/*` → mercury `MERCURY_API_PREFIX`, `/mrc/api/v1/d-image/users/profile` (multer → mercury), `/bkd/api/v1/*` → backbone `BACKBONE_API_PREFIX`, `/health`.
- The server serves `dist/dashboard/browser` (prefers `index.csr.html`) with a client-side fallback; it does not render SSR at runtime.

## Gotchas

- Standalone, mostly `OnPush` components; preserve signal patterns (expose readonly signals). Icons are class constants (`readonly Bell = Bell`).
- `scripts/*.sh` are convenience wrappers around the pnpm scripts; `docs/history/` keeps the notes of the old BFF integration (Vault/Redis era).
- Every environment sets `apiBaseUrl: '/mrc/api/v1'` (relative, through the BFF); config is injected via `APP_CONFIG`/`API_BASE_URL` (`src/app/core/config`), and only `provideAppConfig` imports `environments/environment`. `authInterceptor` adds the `x-iris-csrf: 1` header the BFF requires.
- Extra docs: `docs/` (roadmap, stories, technical, user), `DEVELOPMENT_SETUP.md`, `docs/history/` (historical).
