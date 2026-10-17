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
