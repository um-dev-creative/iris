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

## SSR: acceso a APIs del navegador

El build `build:ssr` genera también el bundle de servidor (`main.server.ts`), así que el código de `src/app` puede ejecutarse sin `window`, `document` ni `localStorage`.

Reglas:

- No accedas a `localStorage`, `sessionStorage`, `window` ni `document` en constructores, `ngOnInit` ni campos sin protegerlos.
- Preferir `isPlatformBrowser(inject(PLATFORM_ID))`; en servicios simples sirve `typeof localStorage === 'undefined'` (como `ThemeService`).
- En el servidor se usa la configuración por defecto del entorno (`environment.*`); nada se persiste.
- `main.server.ts` debe recibir el `BootstrapContext` de Angular y pasarlo a `bootstrapApplication`.
- Toda lógica protegida así debe tener una prueba con `PLATFORM_ID = 'server'` (ver `api.service.spec.ts`).

Revisión de F0-04 (`grep -rn "localStorage\|window\.\|document\." src/app`): `ApiService` (corregido), `ThemeService` (ya protegido con `typeof`) y `SidebarComponent` (`typeof window`) son los únicos usos.
