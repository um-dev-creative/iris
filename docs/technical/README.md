# Documentación técnica de Iris

Documentación para quien desarrolla, prueba, despliega u opera Iris. Cada tarea del [backlog](../roadmap/README.md) indica qué documento de esta carpeta debe actualizar.

| Documento | Contenido | Se crea/actualiza en |
|---|---|---|
| `architecture.md` | Vista general: navegador → SSR + BFF → Mercury / Backbone / Redis / Vault; arranque del proceso | F0-03 |
| `frontend.md` | Estructura de carpetas, rutas, configuración (`APP_CONFIG`), autenticación, HTTP e interceptores, datos y polling, componentes compartidos, feature flags, reglas de SSR | F0-04, F1-02 a F1-04, F2-03 a F2-06, F3-03 a F3-09, F5-04 |
| `backend.md` | Módulos del BFF, rutas, controladores, proxies, sesiones Redis, monitoreo, health checks, pruebas | F0-08, F3-02, F3-07 |
| `security.md` | Secretos, sesión por cookie, CSRF, matriz de controles por entorno | F0-01, F2-01, F5-02 |
| [`environments.md`](environments.md) | Tabla de entornos (`ENVM`), URLs, certificados y variables | F1-05 |
| `testing.md` | Vitest, ejemplos por tipo de prueba, e2e, presupuestos; ver también la [política de cobertura](../roadmap/COVERAGE_POLICY.md) | F0-06, F0-07, F4-01, F4-03 |
| `ci-cd.md` | Pipeline, etapas, despliegue a QA y producción | F0-09, F5-01 |
| `runbook.md` | Arranque, variables, diagnóstico con `traceId`, rollback | F5-01, F5-03, F5-07 |
| [`../api/openapi.yaml`](../api/) | Contrato de los endpoints del BFF | F2-01, F2-02, F3-01 |

## Estado actual (15 oct 2026)

- Frontend Angular 22 standalone, signals, Tailwind 4, SSR con `@angular/ssr`.
- BFF Express en `server/` (CommonJS) con `server.js` como entrada y `createApp()` en `server/app.js` (patrón de Stratum y zerobound-frontend); pruebas Vitest con umbral ≥ 85 % (`pnpm test:server`).
- Pruebas del frontend y CI pendientes (F0-06 a F0-09).
- Documentos históricos de la integración del BFF y Redis: se mueven a `docs/history/` en F0-05.

## Seguridad

- Política de secretos: `default.env`, llaves (`*.key`, `ssl/*.pem`) y logs están excluidos por `.gitignore`; solo se versiona `default.env.example` sin valores.
- Los secretos reales viven en Vault. Si un secreto llega a un remoto, rotarlo aunque se reescriba el historial.
- Detección: `gitleaks` con `.gitleaks.toml` (pre-commit/CI).
