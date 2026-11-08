# Changelog

Todos los cambios relevantes de Iris se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

Cada entrada termina con el ID de la tarea del backlog (`docs/roadmap/`). Secciones permitidas: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## [Unreleased]

### Added
- **Sección «Usuarios»: dar y quitar el acceso de una persona a una o varias aplicaciones, y crear usuarios.** Se elige la aplicación, se ven sus usuarios y de cada uno a qué aplicaciones entra y con qué rol. Es la base para tener administradores de plantillas de una o varias aplicaciones y administradores de la plataforma (`PLATFORM_ADMIN`). El BFF añade `/bkd/api/v1/admin/*` (sesión como `Authorization: Bearer`, ids UUID, campos permitidos al crear). Ver `docs/technical/access-administration.md` y `docs/user/manual-operador.md`.
- Plantillas por aplicación: en **Plantillas** se elige primero la aplicación (`/dashboard/templates`), luego se ven sus plantillas (`/dashboard/templates/:applicationId`) y de ahí se abre el editor (`/dashboard/templates/:applicationId/:id` y `/new`), con ruta de migas para volver. El BFF añade `GET /templates/applications` (aplicaciones de Backbone) y las rutas `/templates/applications/:applicationId` (lista, crear y vista previa), que toman la aplicación de la URL y no necesitan `MONITORED_APPLICATION_ID`. Mercury guarda cada aplicación en su carpeta (`lth/mercury/templates/<aplicación>/`), así que lo que se edita aquí es el mismo archivo que usa para enviar.

### Changed
- **El selector de aplicaciones de Plantillas muestra solo las que la persona puede gestionar.** Lee `GET /mrc/api/v1/templates/applications` de Mercury (todas para un administrador de la plataforma; las que tienen `TEMPLATE_MANAGE` para el resto) en vez de todas las de Backbone.

- El showcase de componentes (enlace del menú y ruta `/dashboard/showcase`) solo existe fuera de producción: `features.showcase` sigue a `production` salvo que el entorno lo defina, y en producción la ruta redirige al dashboard.

### Fixed

- Cuando el panel de monitoreo muestra un servicio como «Down», el BFF ahora dice por qué en el log (`Monitoring: the Backbone health probe /… answered 401`, o el código de error si no hubo respuesta): un 401, 403 o 404 indica una ruta equivocada en `BACKBONE_HEALTH_PATH` o `MERCURY_HEALTH_PATH`, no una caída.
- Entrar en **Plantillas** ya no devuelve al login: la lista de aplicaciones (`GET /templates/applications`) se pedía a Backbone con el encabezado `session-token`, pero los recursos de backbone-rest solo leen la sesión de `Authorization: Bearer`, así que respondía 401 y el navegador cerraba la sesión. El BFF envía ahora la sesión también como `Bearer` (opción `bearer` de `proxyToApi`, que sigue a una sesión renovada).
- El panel de monitoreo ya no muestra Backbone como «Down» cuando está arriba: sondeaba `/actuator/health`, que backbone-rest protege con sesión (401), y ahora usa la sonda pública `/actuator/health/readiness` (`BACKBONE_HEALTH_PATH`).
- El dashboard ya no te devuelve al login cuando Mercury rechaza una sesión que Backbone da por activa (p. ej. Mercury con otro `APP_TOKEN_SECRET`): el panel carga sin campañas y el BFF avisa en el log. Un 401 solo cierra la sesión si Backbone también la rechaza.
- Sign-up asks backbone for the `users:manage` scope (`BACKBONE_CLIENT_SCOPES`), which `UserAdminGuard` requires to check e-mails and create and activate users; the docs state that the M2M client must belong to `BACKBONE_APPLICATION_ID`.

### Security

- Iris corre en HTTPS: `ng serve` y el BFF usan en local un certificado autofirmado (`scripts/dev-cert.mjs`), las cookies de sesión llevan `Secure` y en producción el BFF no arranca sin `COOKIE_SECURE=true`.
- `multer`, `axios` and `express` updated: `pnpm audit --prod` reports no known vulnerabilities.
- Sign-up never takes the role, application or active state from the browser, and does not reveal which e-mails have an account.
- Las cookies de sesión del BFF (`iris_session`, `iris_refresh`) pasan de `SameSite=Lax` a `SameSite=Strict`; se agregaron pruebas de sus atributos, de la respuesta genérica ante credenciales inválidas y de que la sesión sobrevive a un reinicio. (F2-01)
- Las acciones de GitHub del pipeline de CI se fijan por SHA de commit completo (con el tag como comentario). Seguimiento de SonarCloud S7637.
- Los logs del proxy ya no incluyen datos de la petición (ruta ni URL), la renovación de sesión se extrajo a `renewSession` y el límite de subida bajó a 8 MB. Seguimiento de SonarCloud.
- El proxy del BFF rechaza con 400 rutas con segmentos `..`, `//` inicial, barras invertidas o caracteres de control; los logs saneados evitan inyección de líneas; la subida multipart limita archivos, campos y partes. Se resolvieron los hallazgos de SonarCloud.
- Se retiró `default.env` del control de versiones, se agregó `default.env.example` y se ampliaron las exclusiones de `.gitignore` para secretos y llaves TLS. (F0-01)

### Added

- **Template history:** in the editor, **Ver historial** lists the saved versions (saved, restored, original), **Comparar** shows a line diff against the text in the editor and **Restaurar** saves an old version as a new one (with `If-Match`, confirmation and a warning about unsaved changes). System templates open locked until the person ticks a confirmation, and then save with `confirmSystem=true` (the original is kept as a baseline). New BFF routes for the versions and the `confirmSystem` query; the content response field `readOnly` is now `system`. Needs Mercury's `V2032__template_versions.sql` and version endpoints. See `docs/technical/templates.md`.
- **Template editor:** `/dashboard/templates` lists, searches (server-side filters and pagination), creates and deactivates templates; `/templates/new` and `/templates/:id` edit one with Markdown or HTML content, a debounced live preview in a sandboxed iframe, sample parameters detected from the text, syntax errors with line and column ("go to line"), optimistic locking (`ETag`/`If-Match`, a 412 offers to reload), read-only system templates and a warning before leaving with unsaved changes. New BFF routes `/mrc/api/v1/templates/*` (application fixed by the BFF, only whitelisted fields, `location` must be a file name) and `unsavedChangesGuard`. Needs Mercury's template content API; writing needs `mercury:message:write` in `BACKBONE_CLIENT_SCOPES`. See `docs/technical/templates.md` and the operator manual.
- **Template and reference selectors:** BFF routes `/mrc/api/v1/templates/{types,severities,defined}` (Bearer of the application + session; the application is always the BFF's) and `ReferenceDataService`. The campaign form now offers a template selector and keeps an id box when the person cannot list templates (Mercury `TEMPLATE_READ_PERMISSION`). `proxyToApi` accepts a `query` option that replaces the browser's. See `docs/technical/campaigns.md`.
- **Campaign management:** `/dashboard/campaigns` lists the campaigns the person created, with filters, per-row delivery progress and pagination; `/campaigns/new` and `/campaigns/:id/edit` create and edit them (recipients pasted or imported from a CSV, template parameters, draft or scheduled); `/campaigns/:id` shows the live progress and lets the person pause, resume or delete. New BFF routes `/mrc/api/v1/campaigns/*` add the application client's Bearer that Mercury requires, fix the application and drop any field the browser should not set. Writing needs `mercury:message:write` in `BACKBONE_CLIENT_SCOPES` (registered first in Backbone; left off by default so a missing scope cannot break sign-in). The old table is now "Explorador" in the menu. Needs Mercury's `enabled` in the campaign detail to tell paused from active (see Mercury `feat/campaign-detail-enabled`). See `docs/technical/campaigns.md` and the operator manual.
- **Modo oscuro y modo sistema:** el botón de tema recorre claro, oscuro y sistema (icono sol, luna o monitor). En modo sistema Iris sigue `prefers-color-scheme` y se repinta si el sistema cambia; la elección se guarda en `app-theme` y se aplica antes de pintar para evitar el parpadeo. Sin elección guardada, Iris sigue al sistema.
- **Marca de Iris:** logo de ojo y globo de mensaje con un aro de radar (`AppLogoComponent`), en la barra lateral, login, registro y showcase, con favicon e icono de Apple nuevos y anillos de iris en el fondo de las pantallas de acceso.
- **User registration:** `/register` and `/verify-email` pages, with a six-digit code by e-mail, resend and password strength. The BFF orchestrates backbone and Mercury (`/auth/register`, `/auth/verify-email`, `/auth/resend-verification`).
- **Real monitoring data:** `GET /monitoring/overview` aggregates Mercury's campaigns and progress and the health of Mercury and backbone. The dashboard refreshes every 30 seconds while the tab is visible, and shows loading, empty and error states.
- `Dockerfile`, `docker-compose.yml` and `k8s/iris.yaml`. See `docs/technical/deployment.md`.
- Page transitions, a moving background on the access pages and hover feedback on cards, respecting `prefers-reduced-motion`.

- Página **Clientes de login** (`/dashboard/login-clients`): lista, crea, activa o desactiva, rota la contraseña y elimina los servicios backend que pueden pedir un token a Mercury (`POST /api/v1/auth/token`), con confirmación en cada acción. Si no se escribe contraseña, Mercury genera una y se muestra **una sola vez** (con botón de copiar; se borra de memoria al cerrarla o salir de la página). Usa `/mrc/api/v1/general/login-clients` del BFF, que reenvía la sesión de la persona; Mercury decide con su permiso `LOGIN_CLIENT_MANAGE` en Backbone (sin permiso la página lo explica). Necesita la API `/api/v1/login-clients` de Mercury y `LOGIN_CLIENTS_ADMIN_APPLICATION_ID` configurado allí.
- Menú de usuario en la navbar con el perfil real y cierre de sesión con confirmación. (F2-07)
- Interceptor de autenticación: las llamadas al BFF llevan cookies y cabecera CSRF, y una sesión expirada avisa una sola vez y lleva al login. (F2-06)
- Página de inicio de sesión (`/login`) con validación, mensajes de error genéricos y redirección a `returnUrl`. (F2-04)
- Servicio de autenticación con estado de sesión reactivo. (F2-03)
- `GET /mrc/api/v1/auth/me` y el login devuelven el perfil con `name` y `expiresAt` (más `email`/`avatarUrl` si el token los trae) y las respuestas de `/auth/*` llevan `Cache-Control: no-store`. (F2-02)
- Utilidades compartidas de tipos, formateo y paginación. (F1-04)
- Proxy de desarrollo para `ng serve` hacia el BFF local. (F1-01)
- Integración del BFF Node con el servidor SSR de Angular: proxies a Mercury (`/mrc/api/v1/general`, `/auth`, `/d-image`) y Backbone (`/bkd/api/v1`), autenticación OAuth, sesiones y locks en Redis con fallback en memoria, soporte HTTPS y endpoints `/health` y `/health/redis`. (F0-02)
- Configuraciones de entorno `dev`, `qa`, `dev-cloud` y `qa-cloud`.
- Modelo de trabajo multi-agente (`AGENTS.md`, `.github/agents/`) y story IRIS-001.
- Backlog del MVP v0.1.0 en `docs/roadmap/` con 42 tareas, Definition of Done, política de cobertura ≥ 85 % y plan de comunicación.
- Suite de pruebas del BFF (rutas, proxies, sesión, configuración y confinamiento de destinos) con cobertura ≥ 85 % y guardia contra conexiones de red reales. (F0-08)
- Integración continua en GitHub Actions con build SSR, pruebas, cobertura mínima del 85 % y escaneo de secretos. (F0-09)
- Plantilla de pull request, guía de Conventional Commits y README actualizado con requisitos, setup con pnpm y enlaces a la documentación. (F0-10)

### Changed

- `packageManager` pasa a `pnpm@12.15.0`: con 12.11.2 fijado, el pnpm 12.15.0 que lanza corepack abortaba `pnpm dev` con `ERR_PNPM_BAD_PM_VERSION`.
- Redundant scripts removed: `server`, `watch:ssr`, `dev:integrated:unix`, `dev:integrated:win`, `scripts/start-dev.sh`, `scripts/serve-integrated.sh` and `scripts/build-test.sh`. Use `pnpm dev` or `pnpm start:bff`.
- **Settings from `local.env` or Vault:** the BFF reads `secrets/local.env`, then `config/local.env` and, with `VAULT_ENABLED=true`, Vault, which fills only what is still empty. Local runs and Docker use the same files, as Mercury and ZeroBound do, and Kubernetes builds `iris-secrets` from `secrets/local.env`. `default.env`, `.env.docker` and `.env.secrets` are gone; `.env` is only for Compose substitutions. `docker-compose.yml` now sets the port, the service URLs and the internal CA. `pnpm start:bff` loads both files in `package.json` and `pnpm dev` runs `ng serve` and the BFF together.
- `authGuard` protege el dashboard con la sesión real y se agrega `guestGuard` para `/login`. (F2-05)
- Todos los entornos consumen la API a través del BFF con URL relativa; se agregaron configuraciones de build para dev, qa y cloud. (F1-05)
- `build:ssr` compila el target de servidor con el mismo `ENVM` (antes siempre con `production`). (F1-05)
- La configuración de la aplicación se inyecta mediante `APP_CONFIG` y `API_BASE_URL`. (F1-03)
- Las rutas de la aplicación se definen en constantes tipadas (`ROUTE_PATHS`). (F1-02)
- BFF reescrito con el patrón de Stratum y zerobound-frontend: `createApp()` sin efectos, configuración por variables de entorno con validación de arranque, sesión por cookies httpOnly con renovación automática, protección CSRF por cabecera, trazas W3C, proxies a Mercury y Backbone y pruebas (≥ 85 %). Rutas `/mrc/api/v1/*` y `/bkd/api/v1/*` conservadas; el login (`access-token`) ahora usa solo la sesión de Backbone. (F0-02)
- El servidor se arranca desde un único punto (`createApp` en `server/app.js`); `server.js` queda como lanzador que valida la configuración. (F0-03)
- pnpm es el único gestor de paquetes (`packageManager`, `engines`, lockfile versionado); documentación histórica reorganizada en `docs/history/` y scripts en `scripts/`. (F0-05)
- Las pruebas usan Vitest con un umbral mínimo de cobertura del 85 % en frontend y backend. (F0-06)
- Pruebas del frontend existente (servicios, interceptor, componentes compartidos, layout y páginas) con ≥ 85 % de cobertura; `showcase-page` queda excluida. (F0-07)
- Actualización a Angular 22.2.3 con TypeScript 6.0.

### Fixed

- `BACKBONE_TLS_INSECURE` ahora cubre todas las llamadas a backbone y mercury (proxy, monitoreo y registro), como ya decía la documentación.
- El registro deshabilitado ya no responde 503 en silencio: el BFF nombra las variables que faltan al arrancar y en cada intento.
- Mensajes y etiquetas ilegibles: los errores de formulario y las alertas usaban `text-destructive-foreground` sobre fondo claro (casi blanco sobre blanco), y varios colores no alcanzaban 4.5:1 en algún tema. Los tokens de `src/styles.css` cumplen ahora WCAG AA como texto y como relleno en ambos temas.
- `create-user` and `verify-code` pointed to Mercury routes that do not exist; registration now goes through backbone.
- `animate-fade-in` was used but never defined, so those animations did not run.
- El renderizado en servidor ya no falla al leer la configuración de API guardada en el navegador. (F0-04)

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
