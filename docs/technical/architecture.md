# Arquitectura de Iris

## Vista general

```
Navegador ──► BFF Express (server.js → server/app.js) ──► Mercury   (/mercury/api/v1)
                │                                      └─► Backbone (/backbone/api/v1)
                └─► dist/dashboard/browser (Angular, fallback a index.csr.html)
```

## Arranque del proceso

`server.js` (lanzador) → `dotenv` → `settingsProblems()` (sale con código 78 si la configuración de producción está incompleta) → `createApp()` (`server/app.js`, sin efectos secundarios) → `http`/`https.createServer(app).listen(PORT)`.

`createApp({ distPath })` es el **único** lugar donde se registran middlewares y rutas: CORS, cookies, límite de peticiones, trazas W3C, `/health`, CSRF, rutas `/mrc/api/v1/*` y `/bkd/api/v1/*`, 404 JSON para APIs desconocidas y el fallback de la SPA. Las pruebas lo invocan sin abrir puertos propios.

## Configuración

Variables de entorno leídas en `server/config/constants.js` (ver `default.env.example`). No hay Vault ni Redis: la sesión viaja en cookies httpOnly y se renueva contra Backbone.

## Notas sobre la tarea F0-03

La tarea original proponía `src/server.ts` como fuente de verdad y un lanzador con Vault y flags `yargs`. Se resolvió de otra forma al reescribir el BFF con el patrón de Stratum y zerobound-frontend (PR #31): `src/server.ts` se eliminó, la fábrica vive en `server/app.js` y los flags de Vault/Redis dejaron de existir.
