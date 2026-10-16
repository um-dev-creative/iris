# [F3-06] Vista de mensajes con filtros, búsqueda y paginación del servidor

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Vista de mensajes con filtros, búsqueda y paginación del servidor |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE + BE |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `backend`, `dashboard` |
| Depende de | [F3-04](../F3-datos-reales/F3-04-monitoring-api-service-mock-flag.md), [F3-02](../F3-datos-reales/F3-02-endpoints-bff-monitoreo.md) |
| Agentes | `product-owner`, `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | `data-view-page` usa paginación remota y sincroniza filtros con la URL. |
| Backend (BFF Node) | **Sí** | Soporte de filtros y paginación en `GET /monitoring/messages`. |
| Infra / DevOps / Repo | No | — |

## Descripción

La vista de datos filtra y pagina en memoria sobre 30 registros fijos. Con datos reales se necesita filtrar y paginar en el servidor.

## Alcance

### Incluye

- Filtros: estado, proveedor, rango de fechas; búsqueda por id o destinatario con debounce de 300 ms
- Paginación con tamaño 25/50/100 y total de resultados
- Filtros reflejados en query params (enlace compartible y botón atrás)
- Orden por fecha descendente por defecto
- Enmascarar parcialmente el número de destinatario (`+34 612 *** 678`)

### No incluye

- Exportación CSV

### Archivos impactados (estimado)

- `data-view-page.component.*`
- `shared/components/table`
- `server/controller/monitoring.controller.js`

## Criterios de aceptación

- [ ] **AC1** — Cambiar un filtro reinicia a la página 1 y hace una sola petición
- [ ] **AC2** — Copiar la URL y abrirla en otra pestaña reproduce la misma vista
- [ ] **AC3** — Con 0 resultados se muestra un estado vacío con opción de limpiar filtros
- [ ] **AC4** — Los números de teléfono nunca se muestran completos

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Validado con > 10 000 registros en QA sin degradación perceptible
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `data-view-page.component.spec.ts` | Filtros, debounce, sincronización con URL, paginación, vacío | Componente |
| `monitoring.routes.spec.js` | Filtros y paginación del lado BFF | Integración |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Estado en la URL

### Usuario

- [ ] `docs/user/manual-operador.md` § Buscar mensajes: filtros, búsqueda, compartir una vista

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- La vista de mensajes filtra, busca y pagina sobre el total de mensajes reales; los filtros se pueden compartir por enlace. (F3-06)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Operadores | Cómo buscar un mensaje por id o destinatario | Release notes |
| Seguridad / Privacidad | Enmascarado de números de teléfono | Antes del merge |
