# Roadmap MVP Iris v0.1.0 — Backlog de tareas

Backlog para crear en YouTrack. Cada tarea es un archivo Markdown con campos YouTrack, capas impactadas (frontend/backend/infra), alcance, criterios de aceptación, DoD, cobertura, documentación, entrada de CHANGELOG y comunicación.

- [Definition of Done general](DEFINITION_OF_DONE.md)
- [Política de cobertura ≥ 85 %](COVERAGE_POLICY.md)
- [Interesados y comunicación](STAKEHOLDERS.md)
- [Plantilla de tarea](_TEMPLATE.md)
- [CSV para importación en YouTrack](youtrack-import.csv)
- [CHANGELOG](../../CHANGELOG.md) · [Docs técnicas](../technical/README.md) · [Docs de usuario](../user/README.md)

## Resumen por fase

| Fase | Nombre | Fechas | Tareas | Estimación | FE | BE |
|---|---|---|---:|---:|---:|---:|
| [F0](F0-saneamiento/EPIC.md) | Saneamiento, pruebas y CI | 19 oct – 30 oct 2026 | 10 | 15.5d | 5 | 5 |
| [F1](F1-fundaciones/EPIC.md) | Fundaciones (IRIS-001) | 2 nov – 6 nov 2026 | 5 | 4.5d | 5 | 1 |
| [F2](F2-autenticacion/EPIC.md) | Autenticación | 2 nov – 13 nov 2026 | 7 | 8.5d | 5 | 3 |
| [F3](F3-datos-reales/EPIC.md) | Datos reales de monitoreo | 9 nov – 27 nov 2026 | 9 | 13.5d | 8 | 4 |
| [F4](F4-calidad/EPIC.md) | Calidad end-to-end | 16 nov – 27 nov 2026 | 4 | 4.5d | 2 | 2 |
| [F5](F5-release/EPIC.md) | Release MVP v0.1.0 | 23 nov – 4 dic 2026 | 7 | 10.5d | 4 | 4 |
| **Total** | | | **42** | **57d** | **29** | **19** |

## Capacidad

La estimación total es de **57 días-persona** y el calendario tiene unos 35 días hábiles (19 oct – 4 dic 2026). Para cumplir la fecha hacen falta **2 personas**, por ejemplo una centrada en frontend y otra en backend/infra; el corte por capas de cada tarea facilita repartirlas. Con una sola persona, el MVP se mueve a mediados de enero de 2027 o hay que pasar a post-MVP las tareas `should`/`could` (F0-05, F1-02, F1-04, F3-08, F4-02, F4-03, F5-03), que suman 7 días.

## Ruta crítica

`F0-01 → F0-02 → F0-03 → F0-08 → F2-01 → F2-02 → F2-03 → F2-04 → F2-05` y en paralelo `F3-01 (contrato) → F3-02 → F3-05/F3-06 → F3-09 → F5-05 → F5-06 → F5-07`.

`F3-01` no depende de código: debe iniciarse en la semana 1 porque requiere al equipo Mercury.

## Todas las tareas

| ID | Tarea | Tipo | Prioridad | MoSCoW | Capas | Est. |
|---|---|---|---|---|---|---|
| [F0-01](F0-saneamiento/F0-01-remover-secretos-gitignore.md) | Remover secretos del repositorio y endurecer .gitignore | Task | Show-stopper | must | BE + Infra | 0.5d |
| [F0-02](F0-saneamiento/F0-02-integrar-rama-mer-1.md) | Commitear por bloques e integrar la rama mer-1 en main | Task | Critical | must | FE + BE + Infra | 1d |
| [F0-03](F0-saneamiento/F0-03-unificar-entrada-servidor.md) | Unificar el punto de entrada del servidor | Task | Critical | must | BE + Infra | 2d |
| [F0-04](F0-saneamiento/F0-04-ssr-localstorage-apiservice.md) | Corregir acceso a localStorage en ApiService durante SSR | Bug | Critical | must | FE | 0.5d |
| [F0-05](F0-saneamiento/F0-05-higiene-repositorio.md) | Consolidar pnpm, limpiar archivos legados y reorganizar documentación | Task | Major | should | FE + Infra | 1d |
| [F0-06](F0-saneamiento/F0-06-vitest-quality-gate-85.md) | Migrar las pruebas a Vitest y configurar el quality gate de cobertura 85 % | Task | Critical | must | FE + BE + Infra | 2d |
| [F0-07](F0-saneamiento/F0-07-backfill-pruebas-frontend.md) | Backfill de pruebas del frontend existente hasta 85 % | Task | Critical | must | FE | 3d |
| [F0-08](F0-saneamiento/F0-08-backfill-pruebas-bff.md) | Backfill de pruebas del BFF hasta 85 % | Task | Critical | must | BE | 4d |
| [F0-09](F0-saneamiento/F0-09-pipeline-ci.md) | Pipeline de CI con build SSR, pruebas y cobertura | Task | Critical | must | Infra | 1d |
| [F0-10](F0-saneamiento/F0-10-changelog-readme-plantillas.md) | Crear CHANGELOG, actualizar README y plantillas de PR | Task | Major | must | Infra | 0.5d |
| [F1-01](F1-fundaciones/F1-01-proxy-desarrollo-bff.md) | Proxy de desarrollo de ng serve hacia el BFF | Task | Major | must | FE | 0.5d |
| [F1-02](F1-fundaciones/F1-02-route-paths-constantes.md) | Constantes de rutas ROUTE_PATHS | Task | Normal | should | FE | 1d |
| [F1-03](F1-fundaciones/F1-03-tokens-app-config.md) | Tokens de configuración APP_CONFIG y API_BASE_URL | Task | Major | must | FE | 1d |
| [F1-04](F1-fundaciones/F1-04-shared-utils.md) | Utilidades compartidas en shared/utils | Task | Normal | should | FE | 1d |
| [F1-05](F1-fundaciones/F1-05-normalizar-entornos.md) | Normalizar entornos y usar URL relativa al BFF | Task | Major | must | FE + BE + Infra | 1d |
| [F2-01](F2-autenticacion/F2-01-validar-oauth-sesion-cookie.md) | Validar el flujo OAuth del BFF y emitir sesión por cookie httpOnly | Feature | Critical | must | BE + Infra | 2d |
| [F2-02](F2-autenticacion/F2-02-endpoint-sesion-actual.md) | Endpoint de sesión actual GET /mrc/api/v1/auth/me | Feature | Major | must | BE | 0.5d |
| [F2-03](F2-autenticacion/F2-03-auth-service-signals.md) | AuthService con signals | Feature | Critical | must | FE | 1.5d |
| [F2-04](F2-autenticacion/F2-04-pagina-login.md) | Página de inicio de sesión | Feature | Critical | must | FE | 2d |
| [F2-05](F2-autenticacion/F2-05-guards-reales.md) | authGuard real y guestGuard | Feature | Critical | must | FE | 0.5d |
| [F2-06](F2-autenticacion/F2-06-auth-interceptor-401.md) | Interceptor de autenticación y manejo de sesión expirada | Feature | Critical | must | FE | 1d |
| [F2-07](F2-autenticacion/F2-07-logout-perfil-navbar.md) | Cerrar sesión y perfil de usuario en la navbar | Feature | Major | must | FE + BE | 1d |
| [F3-01](F3-datos-reales/F3-01-contrato-api-monitoreo.md) | Contrato de API de monitoreo (OpenAPI) | Task | Show-stopper | must | FE + BE | 2d |
| [F3-02](F3-datos-reales/F3-02-endpoints-bff-monitoreo.md) | Endpoints de monitoreo en el BFF | Feature | Critical | must | BE | 3d |
| [F3-03](F3-datos-reales/F3-03-dtos-mappers-frontend.md) | DTOs y mappers de monitoreo en el frontend | Task | Major | must | FE | 1d |
| [F3-04](F3-datos-reales/F3-04-monitoring-api-service-mock-flag.md) | MonitoringApiService y adapter mock con feature flag | Feature | Critical | must | FE | 1.5d |
| [F3-05](F3-datos-reales/F3-05-home-kpis-reales.md) | Home con KPIs y mensajes recientes reales | Feature | Critical | must | FE | 1d |
| [F3-06](F3-datos-reales/F3-06-logs-filtros-paginacion.md) | Vista de mensajes con filtros, búsqueda y paginación del servidor | Feature | Critical | must | FE + BE | 2d |
| [F3-07](F3-datos-reales/F3-07-estado-servicios-health.md) | Estado de servicios alimentado por health checks | Feature | Major | must | FE + BE | 1d |
| [F3-08](F3-datos-reales/F3-08-polling-visibilidad.md) | Actualización automática por polling con pausa por visibilidad | Feature | Major | should | FE | 1d |
| [F3-09](F3-datos-reales/F3-09-estados-carga-vacio-error.md) | Estados de carga, vacío y error en todas las vistas | Feature | Major | must | FE | 1d |
| [F4-01](F4-calidad/F4-01-smoke-e2e-playwright.md) | Smoke e2e con Playwright | Task | Critical | must | FE + BE + Infra | 2d |
| [F4-02](F4-calidad/F4-02-pruebas-contrato.md) | Pruebas de contrato BFF ↔ OpenAPI | Task | Major | should | BE + Infra | 1d |
| [F4-03](F4-calidad/F4-03-a11y-performance-budget.md) | Presupuestos de accesibilidad y rendimiento | Task | Normal | could | FE + Infra | 1d |
| [F4-04](F4-calidad/F4-04-proteccion-rama-cobertura-pr.md) | Protección de main y reporte de cobertura en PR | Task | Major | must | Infra | 0.5d |
| [F5-01](F5-release/F5-01-docker-despliegue-qa.md) | Imagen Docker y despliegue a QA desde CI | Task | Critical | must | BE + Infra | 2d |
| [F5-02](F5-release/F5-02-hardening-seguridad.md) | Hardening de seguridad por entorno | Task | Critical | must | FE + BE + Infra | 2d |
| [F5-03](F5-release/F5-03-logging-estructurado.md) | Logging estructurado y correlation id | Task | Major | should | FE + BE + Infra | 1d |
| [F5-04](F5-release/F5-04-flags-produccion.md) | Ocultar Showcase y configuración de API en producción | Task | Major | must | FE | 0.5d |
| [F5-05](F5-release/F5-05-manual-operador.md) | Documentación de usuario: manual del operador | Task | Major | must | Docs | 1.5d |
| [F5-06](F5-release/F5-06-uat.md) | Pruebas de aceptación de usuario (UAT) | Task | Critical | must | FE + BE | 3d |
| [F5-07](F5-release/F5-07-release-v0-1-0.md) | Publicar la versión v0.1.0 | Task | Critical | must | Infra | 0.5d |

## Cómo importar en YouTrack

1. Crear el proyecto `IRIS` con los campos *Subsystem* (Frontend, Backend, Infra, Docs) y la versión `0.1.0`.
2. Importar `youtrack-import.csv` (*Administración → Importar → CSV*) mapeando las columnas a los campos.
3. Pegar el contenido del `.md` de cada tarea en la descripción (YouTrack renderiza Markdown).
4. Crear los vínculos *depends on* según la columna `Depends on` del CSV.
5. Vincular cada tarea a su Epic como *subtask of*.

