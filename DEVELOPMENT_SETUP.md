# Development Setup - Integrated Backend + Angular SSR

## Variables de entorno

Copia `default.env.example` a `default.env` (ignorado por git) y completa los valores. El BFF las lee con dotenv y todas tienen valor por defecto para desarrollo local; el detalle de cada una está comentado en el ejemplo.

| Variable | Descripción |
|---|---|
| `ENVM` | Entorno de build de Angular (`dev`, `qa`, `prod`, `dev-cloud`, `qa-cloud`) |
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

## Issue Resolution: Concurrently Command Not Found

The error `sh: concurrently: command not found` occurs when the `concurrently` package is not properly installed or accessible.

### Solution Applied

1. **Concurrently is installed** in `package.json` as `"concurrently": "^9.2.1"`
2. **Updated scripts** to use `npx concurrently` instead of just `concurrently`
3. **Added alternative scripts** that don't require concurrently

## Available Development Commands

### Option 1: Using Concurrently (Recommended)
```bash
pnpm run dev:integrated
```
This runs both the Angular SSR watch mode and the integrated server simultaneously.

### Option 2: Simple Background Process
```bash
pnpm run dev:integrated:simple
```
Uses bash background processes instead of concurrently.

### Option 3: Manual Setup (If concurrently issues persist)
Run these commands in separate terminals:

**Terminal 1 - Angular SSR Watch Mode:**
```bash
pnpm run watch:ssr
```

**Terminal 2 - Integrated Server:**
```bash
pnpm run serve:integrated
```

### Option 4: Single Server (No watch mode)
```bash
pnpm run serve:integrated
```
Builds once and starts the integrated server.

## What Each Command Does

- **`watch:ssr`**: Watches for file changes and rebuilds the Angular SSR application
- **`serve:integrated`**: Builds the app and starts the integrated server with backend APIs
- **`dev:integrated`**: Runs both watch and serve commands simultaneously

## Server Details

When the integrated server starts, it will be available at:

- **HTTPS**: `https://localhost:4001` (primary)
- **HTTP**: `http://localhost:4000` (redirects to HTTPS)

### Backend APIs Available:
- **Mercury Standard**: `/mrc/api/v1/general/*`
- **Mercury Authentication**: `/mrc/api/v1/auth/*`
- **Multimedia**: `/mrc/api/v1/d-image/*`
- **Backbone**: `/bkd/api/v1/*`

### Frontend Routes:
- **Dashboard**: `/dashboard`
- **Root**: `/` (redirects to dashboard)

## Troubleshooting

### If `concurrently` still doesn't work:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. Use the manual setup (Option 3 above)

3. Use the simple script:
   ```bash
   ./scripts/serve-integrated.sh
   ```

### If build fails:
1. Check TypeScript errors in the terminal
2. Ensure all dependencies are installed
3. Try building components separately:
   ```bash
   pnpm run build:dev
   ```

### If SSL certificates are missing:
The server will fallback to HTTP mode automatically and display a warning.

## Development Workflow

1. Start the development server using one of the options above
2. Open `https://localhost:4001/dashboard` in your browser
3. Make changes to Angular components or backend code
4. The watch mode will automatically rebuild the frontend
5. Restart the server to see backend changes

## Production Build

```bash
pnpm run serve:integrated:prod
```

This builds optimized versions and starts the server in production mode.
