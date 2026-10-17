# Backend (BFF)

El BFF vive en `server.js` (lanzador) y `server/` (CommonJS). Ver [arquitectura](architecture.md) para el arranque.

| Carpeta | Contenido |
|---|---|
| `server/app.js` | `createApp()`: middlewares, rutas y fallback de la SPA |
| `server/config/` | `constants.js` (entorno), `settings-check.js` (validación de arranque), `logger.js` |
| `server/shared/` | `proxy.js` (reenvío con renovación de sesión), `backbone.js` (cliente M2M), `session.js` (cookies), `csrf.js`, `trace.js`, `upload.js` |
| `server/routes/` | `auth`, `mercury`, `media`, `backbone` |
| `server/test/` | Especificaciones y dobles |

## Pruebas

`pnpm test:server` (Vitest, entorno node, cobertura v8 con umbral del 85 %). Convenciones:

- **Dobles de Mercury y Backbone**: `server/test/harness.js` levanta dos servidores Express en loopback con estado modificable (`bff.state.loginStatus`, `refreshStatus`, `apiStatus`, `apiBody`, `apiHeaders`, `clientTokens`…) y una instancia real de `createApp()`. Se usan con `const bff = await start({ env })` y `bff.call(path, { method, body, cookie })`. No hay Redis ni Vault en el BFF actual, así que no hay nada que simular de ellos.
- **Entorno**: `constants.js` lee `process.env` al cargarse; el harness fija las variables antes de cargar el BFF y cada archivo `.spec.js` corre en su propio proceso. `constants.spec.js` recarga el módulo con `delete require.cache[...]`.
- **Sin red real** (`server/test/setup.js`): `net.Socket.connect` y `dns.lookup` lanzan si el destino no es loopback; `network-guard.spec.js` lo comprueba.
- **Confinamiento de destinos** (`upstream-confinement.spec.js`): sustituye a la antigua lista blanca de dominios; intentos como `@evil.test`, `//evil.test` o `http://evil.test` en la ruta siguen yendo al host y prefijo configurados.
- Casos de error: Backbone o Mercury caídos (502 con `traceId`), cliente M2M rechazado (502), cuenta bloqueada (429), cookies caducadas o renovación rechazada.
