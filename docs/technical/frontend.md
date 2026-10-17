# Frontend

## Rutas

Las rutas viven en `src/app/core/routes/route-paths.ts` (`ROUTE_PATHS`, segmentos `as const`) y se importan desde el barrel `core/routes`. Ningún archivo fuera de ese módulo escribe una ruta como texto literal.

| Constante | Segmento | Uso |
|---|---|---|
| `ROOT` | `''` | Redirige a `DASHBOARD` |
| `DASHBOARD` | `dashboard` | Padre con `LayoutComponent` y `authGuard`; carga `DASHBOARD_ROUTES` |
| `DATA` / `SETTINGS` / `SHOWCASE` | `data` / `settings` / `showcase` | Páginas hijas de `DASHBOARD` |
| `LOGIN` | `login` | Reservada para F2; sin ruta registrada todavía |
| `WILDCARD` | `**` | Redirige a `DASHBOARD` |

`routeUrl(...segmentos)` arma una URL absoluta: `routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.DATA)` → `/dashboard/data`. Úsala en `routerLink`, `router.navigate` y en cualquier enlace. Una ruta nueva se agrega primero a `ROUTE_PATHS`. Comprobación: `grep -rn "'/dashboard" src/app` solo debe encontrar el comentario de `route-paths.ts`.

## Autenticación

`AuthService` (`core/services`, exportado por el barrel) guarda quién tiene la sesión; los tokens viven en cookies httpOnly del BFF y nunca llegan al código. Señales de solo lectura: `user`, `status` e `isAuthenticated`. Las llamadas van a `${API_BASE_URL}/auth/*` con `withCredentials` y la cabecera `x-iris-csrf`.

| `status` | Significa |
|---|---|
| `unknown` | Aún no se sabe (arranque, o servidor SSR) |
| `authenticated` | Hay sesión; `user()` tiene el perfil |
| `anonymous` | No hay sesión |

| Transición | Cuándo |
|---|---|
| `unknown` → `authenticated` / `anonymous` | `restoreSession()` (`GET /auth/me`) al arrancar en el navegador (`provideAppInitializer` en `app.config.ts`). Las llamadas simultáneas comparten una petición. Si el BFF no responde, queda `anonymous` |
| `unknown`/`anonymous` → `authenticated` | `login(credentials)` correcto. Si falla, la promesa se rechaza con el `HttpErrorResponse` y el estado no cambia |
| cualquiera → `anonymous` | `logout()` (también si el BFF falla) o `clearSession()` (p. ej. un 401) |

En SSR `restoreSession()` no hace nada: el estado queda `unknown` y no hay llamadas (`app.config.server.ts` tampoco registra el inicializador). `DashboardStore.user` y `userInitials` salen de `AuthService.user`. En pruebas se sustituye con `fakeAuth()` (`core/testing/auth.testing.ts`).

### Guards

- `authGuard` protege `/dashboard/**`: si `status` es `unknown` espera a `restoreSession()`; sin sesión devuelve un `UrlTree` a `/login?returnUrl=<ruta pedida>` (con su query, codificada). Con el inicializador de `app.config.ts` el estado ya se conoce antes del primer render, así que el dashboard no llega a pintarse para un visitante.
- `guestGuard` protege `/login`: con sesión redirige a `/dashboard`.
- En SSR ambos dejan pasar y la decisión la toma el navegador (que es quien tiene las cookies).
- Un guard asíncrono debe hacer todos sus `inject()` **antes** del primer `await`; después se pierde el contexto de inyección.

### Página de login

`features/auth/login-page` (ruta pública `/login`, fuera del layout). Formulario reactivo con usuario/correo y contraseña (mostrar/ocultar), validación requerida que impide enviar vacío y enfoca el primer campo con error, botón deshabilitado con spinner mientras envía y mensajes: 401 "Usuario o contraseña incorrectos" (sin indicar cuál), 429 "Demasiados intentos", y 5xx/red "El servicio no está disponible". Tras iniciar sesión navega a `?returnUrl=` si es una ruta interna (empieza con una sola `/`; cualquier otra cosa cae en `/dashboard`).

## Configuración

La configuración por entorno se inyecta con tokens (`src/app/core/config`, barrel `core/config`). `provideAppConfig()` (en `app.config.ts` y `app.config.server.ts`) es el **único** sitio de `src/app` que importa `environments/environment`; todo lo demás inyecta `APP_CONFIG` o `API_BASE_URL`.

| Clave de `AppConfig` | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `production` | `boolean` | `false` | `true` en el build de producción |
| `apiBaseUrl` | `string` | `/mrc/api/v1` | Raíz de la API, relativa al BFF; alimenta `API_BASE_URL` |
| `pollingIntervalMs` | `number` | `30000` | Refresco de datos en vivo (lo usan las fases con datos reales) |
| `features.mockData` | `boolean` | `true` | Datos simulados en lugar de la API |
| `features.showcase` | `boolean` | `true` | Muestra la página de showcase |

Para agregar una variable: declararla en `AppConfig`, darle su valor en `DEFAULT_APP_CONFIG` y definirla en los `environment*.ts` que la cambien; `provideAppConfig` mezcla el entorno sobre los valores por defecto sin más cambios, y ningún servicio se toca.

En pruebas se sobreescribe con `{ provide: API_BASE_URL, useValue: '/test/api' }` o con `provideAppConfig({ apiBaseUrl: '/test/api' })`.

## Utilidades

`src/app/shared/utils` (barrel `shared/utils`) reúne funciones puras, sin Angular, con JSDoc y cobertura del 100 %.

| Archivo | Funciones |
|---|---|
| `type-guards.ts` | `isDefined` (no `undefined`), `isNonNull` (ni `null` ni `undefined`), `isString`, `isRecord` |
| `mappers.ts` | `formatTimestamp(valor, { locale, timeZone })` (`''` si es inválido; `es-MX` por defecto), `formatNumber`, `toSelectOption` |
| `pagination.ts` | `paginate(items, page, pageSize)` → `Page<T>` con `items`, `start`, `end`, `pageCount`; `pageCount` (mínimo 1); `clampPage` |

`paginate` ajusta la página al rango válido, por lo que una página 0 o fuera de rango nunca devuelve una página vacía por error. `DataViewPageComponent` la usa para sus registros. Antes de escribir un helper nuevo en un componente o servicio, revisa si encaja aquí.

## SSR: acceso a APIs del navegador

El build `build:ssr` genera también el bundle de servidor (`main.server.ts`), así que el código de `src/app` puede ejecutarse sin `window`, `document` ni `localStorage`.

Reglas:

- No accedas a `localStorage`, `sessionStorage`, `window` ni `document` en constructores, `ngOnInit` ni campos sin protegerlos.
- Preferir `isPlatformBrowser(inject(PLATFORM_ID))`; en servicios simples sirve `typeof localStorage === 'undefined'` (como `ThemeService`).
- En el servidor se usa la configuración por defecto del entorno (`environment.*`); nada se persiste.
- `main.server.ts` debe recibir el `BootstrapContext` de Angular y pasarlo a `bootstrapApplication`.
- Toda lógica protegida así debe tener una prueba con `PLATFORM_ID = 'server'` (ver `api.service.spec.ts`).

Revisión de F0-04 (`grep -rn "localStorage\|window\.\|document\." src/app`): `ApiService` (corregido), `ThemeService` (ya protegido con `typeof`) y `SidebarComponent` (`typeof window`) son los únicos usos.
