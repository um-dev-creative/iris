# Epic F3 · Datos reales de monitoreo

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Tipo | Epic |
| Fechas | 9 nov – 27 nov 2026 |
| Sprint | Sprint 3–4 |
| Fix version | 0.1.0 |

## Objetivo

Reemplazar los datos mock por datos reales de Mercury servidos por el BFF, conservando un modo demo para desarrollo.

## Criterios de salida

- [ ] Ningún valor visible proviene de literales en el código de producción
- [ ] Logs con filtros, búsqueda y paginación del servidor
- [ ] Cada tarjeta y tabla tiene estados de carga, vacío y error
- [ ] Cobertura global ≥ 85 %

## Tareas

| ID | Tarea | Prioridad | FE | BE | Infra | Est. | Depende de |
|---|---|---|:-:|:-:|:-:|---|---|
| [F3-01](F3-01-contrato-api-monitoreo.md) | Contrato de API de monitoreo (OpenAPI) | Show-stopper | ● | ● |  | 2d | — |
| [F3-02](F3-02-endpoints-bff-monitoreo.md) | Endpoints de monitoreo en el BFF | Critical |  | ● |  | 3d | F3-01, F2-01 |
| [F3-03](F3-03-dtos-mappers-frontend.md) | DTOs y mappers de monitoreo en el frontend | Major | ● |  |  | 1d | F3-01, F1-04 |
| [F3-04](F3-04-monitoring-api-service-mock-flag.md) | MonitoringApiService y adapter mock con feature flag | Critical | ● |  |  | 1.5d | F3-03, F1-03 |
| [F3-05](F3-05-home-kpis-reales.md) | Home con KPIs y mensajes recientes reales | Critical | ● |  |  | 1d | F3-04, F3-02 |
| [F3-06](F3-06-logs-filtros-paginacion.md) | Vista de mensajes con filtros, búsqueda y paginación del servidor | Critical | ● | ● |  | 2d | F3-04, F3-02 |
| [F3-07](F3-07-estado-servicios-health.md) | Estado de servicios alimentado por health checks | Major | ● | ● |  | 1d | F3-02, F3-04 |
| [F3-08](F3-08-polling-visibilidad.md) | Actualización automática por polling con pausa por visibilidad | Major | ● |  |  | 1d | F3-04 |
| [F3-09](F3-09-estados-carga-vacio-error.md) | Estados de carga, vacío y error en todas las vistas | Major | ● |  |  | 1d | F3-05, F3-06, F3-07 |
