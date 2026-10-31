# Backend (BFF)

El BFF vive en `server.js` (lanzador) y `server/` (CommonJS). Ver [arquitectura](architecture.md) para el arranque.

| Carpeta | Contenido |
|---|---|
| `server/app.js` | `createApp()`: middlewares, rutas y fallback de la SPA |
| `server/config/` | `constants.js` (entorno), `settings-check.js` (validación de arranque), `logger.js` |
| `server/shared/` | `proxy.js` (reenvío con renovación de sesión), `backbone.js` (cliente M2M), `session.js` (cookies), `csrf.js`, `trace.js`, `upload.js` |
| `server/routes/` | `auth`, `mercury`, `media`, `backbone` |
| `server/test/` | Especificaciones y dobles |

## Sesión

La sesión no se guarda en el servidor (no hay Redis): vive en dos cookies que emite el BFF al hacer login contra Backbone y que el navegador reenvía en cada llamada.

| Cookie | Contenido | Atributos |
|---|---|---|
| `iris_session` | JWT de sesión; el BFF lo reenvía a Mercury y Backbone en la cabecera `session-token` | `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` si `COOKIE_SECURE=true` |
| `iris_refresh` | JWT de renovación | Igual; ambas caducan con el refresh token |

- La respuesta de login lleva solo el perfil (`{ authenticated, user }`), nunca tokens.
- Credenciales inválidas (Backbone 400/401/404/406) devuelven siempre `401 {"error":"Invalid credentials"}`: no se distingue usuario inexistente de contraseña errónea.
- No existe un middleware `requireSession` aparte: toda ruta autenticada es un proxy (`shared/proxy.js`), que responde 401 sin cookie y, ante un 401 de Mercury/Backbone, renueva la sesión una vez con `iris_refresh` y reintenta.
- Como el estado está en las cookies, un reinicio del BFF no cierra sesiones (`session-cookie.spec.js` lo comprueba con `bff.restart()`).
- Las llamadas que cambian estado exigen la cabecera `x-iris-csrf: 1`.

## Pruebas

`pnpm test:server` (Vitest, entorno node, cobertura v8 con umbral del 85 %). Convenciones:

- **Dobles de Mercury y Backbone**: `server/test/harness.js` levanta dos servidores Express en loopback con estado modificable (`bff.state.loginStatus`, `refreshStatus`, `apiStatus`, `apiBody`, `apiHeaders`, `clientTokens`…) y una instancia real de `createApp()`. Se usan con `const bff = await start({ env })` y `bff.call(path, { method, body, cookie })`. No hay Redis ni Vault en el BFF actual, así que no hay nada que simular de ellos.
- **Entorno**: `constants.js` lee `process.env` al cargarse; el harness fija las variables antes de cargar el BFF y cada archivo `.spec.js` corre en su propio proceso. `constants.spec.js` recarga el módulo con `delete require.cache[...]`.
- **Sin red real** (`server/test/setup.js`): `net.Socket.connect` y `dns.lookup` lanzan si el destino no es loopback; `network-guard.spec.js` lo comprueba.
- **Confinamiento de destinos** (`upstream-confinement.spec.js`): sustituye a la antigua lista blanca de dominios; intentos como `@evil.test`, `//evil.test` o `http://evil.test` en la ruta siguen yendo al host y prefijo configurados.
- Casos de error: Backbone o Mercury caídos (502 con `traceId`), cliente M2M rechazado (502), cuenta bloqueada (429), cookies caducadas o renovación rechazada.

## Clientes de login de Mercury

`/mrc/api/v1/general/login-clients[/**]` no tiene código propio: lo atiende el proxy genérico de Mercury (`passThrough('mercury')`) hacia `{MERCURY_BASE_URL}{MERCURY_API_PREFIX}/login-clients`,
con el `session-token` de la cookie y la cabecera CSRF `x-iris-csrf: 1` en los métodos que no son GET. La autorización la decide Mercury (permiso `LOGIN_CLIENT_MANAGE` en la aplicación
`LOGIN_CLIENTS_ADMIN_APPLICATION_ID`, comprobado con la sesión de la persona contra el IAM de Backbone); un 403 de Mercury llega tal cual a la página. `server/test/proxy.spec.js`
fija el reenvío de métodos, rutas y cuerpos (incluida la contraseña generada, que el BFF no registra), el paso del 403 y el bloqueo sin CSRF.
