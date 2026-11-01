# Development Setup - Integrated Backend + Angular SSR

## Variables de entorno

Copia `secrets/local.env.example` a `secrets/local.env` (ignorado por git) y completa los valores; los no secretos están en `config/local.env`. Todas tienen valor por defecto para desarrollo local y también pueden venir de Vault: ver [entornos](docs/technical/environments.md#dónde-van-las-variables).

| Variable | Descripción |
|---|---|
| `ENVM` | Entorno de build de Angular (`development`, `dev`, `qa`, `dev-cloud`, `qa-cloud`, `production`); equivalencias en [docs/technical/environments.md](docs/technical/environments.md) |
| `NODE_ENV` | `production` exige las tres variables de Backbone siguientes |
| `PORT` | Puerto del BFF (4000) |
| `MERCURY_BASE_URL` / `MERCURY_API_PREFIX` | Gateway de Mercury y raíz de su API |
| `BACKBONE_BASE_URL` / `BACKBONE_API_PREFIX` | Gateway de Backbone y raíz de su API |
| `BACKBONE_APPLICATION_ID` | Aplicación Iris registrada en Backbone |
| `BACKBONE_CLIENT_ID` / `BACKBONE_CLIENT_SECRET` | Cliente M2M de Iris; el secreto viene del gestor de secretos, nunca de git |
| `COOKIE_SECURE`, `CORS_ORIGIN`, `TRUST_PROXY` | Cookies, CORS y proxies de confianza |
| `SSL_CERT_PATH` / `SSL_KEY_PATH` | HTTPS opcional (ambas juntas) |

Pruebas: `pnpm test:server` (BFF), `pnpm test` (frontend) y `pnpm test:all`; ver `docs/technical/testing.md`.

Detección de secretos: `gitleaks detect --config .gitleaks.toml` (instalar con `brew install gitleaks`).

El hook `pre-commit` (`.githooks/pre-commit`) ejecuta `gitleaks protect --staged` y bloquea el commit si hay hallazgos o si gitleaks no está instalado. Se activa con `pnpm install` (script `prepare`) o manualmente con `git config core.hooksPath .githooks`.

## Desarrollo frontend con BFF

`pnpm start` sirve el frontend en :4200 y reenvía `/mrc/**`, `/bkd/**` y `/health` al BFF mediante `proxy.conf.mjs` (referenciado en `angular.json` → `serve.options.proxyConfig`). El navegador solo habla con :4200, así que no hay CORS.

```bash
pnpm dev             # ng serve en :4200 con proxy al BFF en :4000
curl localhost:4200/health   # {"status":"UP"}
```

| Variable | Qué hace |
|---|---|
| `IRIS_BFF_URL` | Destino del proxy. Por defecto `http://localhost:4000`. Con el BFF en HTTPS: `IRIS_BFF_URL=https://localhost:4001 pnpm start` (el proxy acepta certificados autofirmados, solo en desarrollo) |

Las llamadas a `/mrc/api/v1/**` y `/bkd/api/v1/**` exigen la cabecera `x-iris-csrf: 1` y, salvo las públicas, una sesión.
