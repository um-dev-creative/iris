# Changelog

Todos los cambios relevantes de Iris se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

Cada entrada termina con el ID de la tarea del backlog (`docs/roadmap/`). Secciones permitidas: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## [Unreleased]

### Security

- Se retiró `default.env` del control de versiones, se agregó `default.env.example` y se ampliaron las exclusiones de `.gitignore` para secretos y llaves TLS. (F0-01)

### Added

- Integración del BFF Node con el servidor SSR de Angular: proxies a Mercury (`/mrc/api/v1/general`, `/auth`, `/d-image`) y Backbone (`/bkd/api/v1`), autenticación OAuth, sesiones y locks en Redis con fallback en memoria, soporte HTTPS y endpoints `/health` y `/health/redis`. (F0-02)
- Configuraciones de entorno `dev`, `qa`, `dev-cloud` y `qa-cloud`.
- Modelo de trabajo multi-agente (`AGENTS.md`, `.github/agents/`) y story IRIS-001.
- Backlog del MVP v0.1.0 en `docs/roadmap/` con 42 tareas, Definition of Done, política de cobertura ≥ 85 % y plan de comunicación.

### Changed

- BFF reescrito con el patrón de Stratum y zerobound-frontend: `createApp()` sin efectos, configuración por variables de entorno con validación de arranque, sesión por cookies httpOnly con renovación automática, protección CSRF por cabecera, trazas W3C, proxies a Mercury y Backbone y pruebas (≥ 85 %). Rutas `/mrc/api/v1/*` y `/bkd/api/v1/*` conservadas; el login (`access-token`) ahora usa solo la sesión de Backbone. (F0-02)
- El servidor se arranca desde un único punto (`createApp` en `server/app.js`); `server.js` queda como lanzador que valida la configuración. (F0-03)
- pnpm es el único gestor de paquetes (`packageManager`, `engines`, lockfile versionado); documentación histórica reorganizada en `docs/history/` y scripts en `scripts/`. (F0-05)
- Las pruebas usan Vitest con un umbral mínimo de cobertura del 85 % en frontend y backend. (F0-06)
- Actualización a Angular 22.2.3 con TypeScript 6.0.

### Removed

- Vault, Redis, el paquete `config`, `src/server.ts` y los scripts `validate-*.js` / `test-*.js` del BFF anterior, junto con las dependencias que solo ellos usaban.



- Arranque de la aplicación con `bootstrapApplication` y SSR mediante `@angular/ssr`; se retiran los `NgModule` legados.
- Gestor de paquetes pnpm.

## [0.0.3] - 2026-02-19

### Changed

- Mejoras de diseño y estilos del dashboard; README inicial.

### Added

- Sistema de diseño migrado a tokens oklch y dashboard de monitoreo de mensajería (KPIs, sparklines, logs, estado de servicios).

## [0.0.2] - 2026-02-18

### Changed

- Actualización de Angular 19 a 21 y corrección de contraste en modo oscuro.

## [0.0.1] - 2026-02-18

### Added

- MVP inicial del dashboard con Angular 19 y Tailwind CSS v4.
- Proyecto renombrado de `mercury-frontend` a Iris.

[Unreleased]: https://github.com/um-dev-creative/iris/compare/a54ad81...HEAD
