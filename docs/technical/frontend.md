# Frontend

## SSR: acceso a APIs del navegador

El build `build:ssr` genera también el bundle de servidor (`main.server.ts`), así que el código de `src/app` puede ejecutarse sin `window`, `document` ni `localStorage`.

Reglas:

- No accedas a `localStorage`, `sessionStorage`, `window` ni `document` en constructores, `ngOnInit` ni campos sin protegerlos.
- Preferir `isPlatformBrowser(inject(PLATFORM_ID))`; en servicios simples sirve `typeof localStorage === 'undefined'` (como `ThemeService`).
- En el servidor se usa la configuración por defecto del entorno (`environment.*`); nada se persiste.
- `main.server.ts` debe recibir el `BootstrapContext` de Angular y pasarlo a `bootstrapApplication`.
- Toda lógica protegida así debe tener una prueba con `PLATFORM_ID = 'server'` (ver `api.service.spec.ts`).

Revisión de F0-04 (`grep -rn "localStorage\|window\.\|document\." src/app`): `ApiService` (corregido), `ThemeService` (ya protegido con `typeof`) y `SidebarComponent` (`typeof window`) son los únicos usos.
