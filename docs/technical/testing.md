# Pruebas

Vitest en ambos proyectos, con cobertura v8 y umbral de **85 %** (líneas, sentencias, funciones y ramas). Ver la [política de cobertura](../roadmap/COVERAGE_POLICY.md).

| Comando | Qué hace |
|---|---|
| `pnpm test` | Frontend (`@angular/build:unit-test`, runner Vitest, jsdom) con cobertura → `coverage/frontend/lcov.info` |
| `pnpm test:watch` | Frontend en modo watch |
| `pnpm test:server` | BFF (`vitest.server.config.mjs`) con cobertura → `coverage/server/lcov.info` |
| `pnpm test:all` | Servidor y luego frontend |
| `pnpm coverage:merge` | Une ambos `lcov.info` en `coverage/lcov.info` |

Ambos comandos terminan con código ≠ 0 si cualquier métrica baja de 85 %. Una sola spec: `pnpm ng test --no-watch --include='src/app/**/api.service.spec.ts'` (frontend) o `pnpm vitest run --config vitest.server.config.mjs server/test/auth.spec.js` (BFF).

## Frontend

Specs junto al código (`*.spec.ts`), globals de Vitest (`describe`, `it`, `expect`, `vi`). HTTP con `provideHttpClient()` + `provideHttpClientTesting()` y `HttpTestingController`; rutas con `provideRouter([])`. Ejemplo: `src/app/app.component.spec.ts`.

## BFF

Specs en `server/test/*.spec.js` (CommonJS con globals de Vitest). `server/test/harness.js` levanta `createApp()` junto a dos dobles de Backbone y Mercury con estado modificable; cada archivo corre en su propio proceso porque el BFF lee `process.env` al cargarse. Nada sale a la red real.

Para probar un caso nuevo: `const bff = await start({ env })`, ajustar `bff.state` (por ejemplo `loginStatus`, `apiStatus`) y llamar `bff.call(path, { method, body, cookie })`.

## Estado

El gate del BFF está en verde. El del frontend sigue por debajo de 85 % hasta completar F0-07, por lo que `pnpm test` termina con error de umbral (esperado).
