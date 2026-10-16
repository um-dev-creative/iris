# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `AGENTS.md` for the detailed conventions and the multi-agent delivery model (manager-project → product-owner → repo-requirements-analyst → developer → test-writer). The essentials are below.

## Overview

`iris` is an Angular 21 monitoring dashboard (standalone components, signals, Tailwind CSS v4, `lucide-angular`) served by a Node/Express BFF. The Angular CLI project and npm package are both named **`dashboard`** (use `ng build dashboard`, not `iris`). The README is in Spanish and minimal.

## Commands

The repo declares `packageManager: pnpm` (`pnpm-lock.yaml`); use pnpm and don't mix lockfiles.

- `pnpm start`: `ng serve` on :4200, frontend only (no backend APIs).
- `pnpm build:dev`: development build. `pnpm build` and `pnpm build:ssr` need `ENVM` set (see `default.env`; environments are in `src/environments/`: dev, qa, prod, cloud).
- `pnpm serve:integrated`: SSR build and then `node server.js` (full stack, HTTPS if `/ssl` certs exist, otherwise HTTP).
- `pnpm dev:integrated:unix`: watches the SSR build and runs `node server.js`.
- `pnpm test`: Karma/Jasmine, headless with coverage. Single spec: `pnpm ng test --no-watch --browsers ChromeHeadlessNoSandbox --include='src/app/path/to/x.spec.ts'`. There are currently no `*.spec.ts` files, and schematics skip test generation.
- No lint script is configured.
- `pnpm start-dev:unix` runs `server.js` with Vault flags (`--vaultToken --vaultUrl --vaultPath UMDC/data/iris/$ENVM`). Backend config comes from Vault, CLI flags and env vars, falling back to `server/config/*.json`.

## Architecture

Two cooperating halves:

**Frontend (`src/app`)**
- `src/main.ts` bootstraps `AppComponent`. Routing is two-level and lazy: `app.routes.ts` (`/dashboard`, guarded by `authGuard`) and `features/dashboard/dashboard.routes.ts` (`home`, `data`, `settings`, `showcase`). Keep new routes aligned with this split.
- `core/` holds cross-cutting services, guards, interceptors and models. `features/dashboard/` holds pages and their feature services. `layout/` is the shell: sidebar and navbar, with pages rendered in its `router-outlet`. `shared/` holds reusable UI.
- Barrels are used heavily (`core/services/index.ts`, `shared/components/index.ts`). Import through them, and export new shared components through the barrel.
- State is signal-first: `DashboardStore` is the UI state; `ThemeService` toggles `html.dark` and persists `app-theme`; `ApiService` holds the runtime API base config persisted as `api_config` in `localStorage`.
- `httpErrorInterceptor` retries 5xx once and emits toasts through `NotificationService`. The toast UI renders once, in the layout shell.
- Dark mode is the `.dark` class on `<html>` (`@custom-variant dark`), not `prefers-color-scheme`. Design tokens live in `src/styles.css` (`@theme inline`).
- `authGuard` is a permissive placeholder (`return true`). There is no real auth enforcement on the frontend.

**Backend (`server.js` + `server/`)**
- `server.js` (CommonJS) is the runtime entry. It sets `NODE_CONFIG_DIR=server/config`, applies compression, CORS, rate limiting and `express-http-context`, mounts the API routes, and serves the Angular build from `dist/dashboard/browser` (it prefers `index.csr.html` and falls back to `index.html`). `src/server.ts` is the Angular SSR piece built by `ng run dashboard:server`.
- `server/` is plain CommonJS (`require`, not ES imports), laid out as `routes/` → `controller/` → `proxy/` (axios clients for upstream services). `shared/` has Redis client, lock and session stores, and error utilities.
- API prefixes don't collide with Angular routes: `/mrc/api/v1/general/*` (Mercury proxy), `/mrc/api/v1/auth/*` (auth), `/mrc/api/v1/d-image/*` (multer uploads), `/bkd/api/v1/*` (Backbone proxy).
- `server.js` sets `NODE_TLS_REJECT_UNAUTHORIZED=0` when `NODE_ENV !== 'production'`.

## Gotchas

- Standalone, mostly `OnPush` components; preserve signal patterns (expose readonly signals). Icons are class constants (`readonly Bell = Bell`).
- Root-level `validate-*.js`, `test-*.js` and `*.sh` files are ad-hoc integration and SSL/Redis check scripts, not part of the Karma suite.
- The default API endpoint in the environments is `https://jsonplaceholder.typicode.com`, a placeholder.
- Extra docs: `docs/` (roadmap, stories, technical, user), `DEVELOPMENT_SETUP.md`, `HTTPS_README.md`, `BACKEND_INTEGRATION_LOG.md`.
