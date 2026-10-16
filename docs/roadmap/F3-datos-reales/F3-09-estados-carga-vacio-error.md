# [F3-09] Estados de carga, vacío y error en todas las vistas

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Estados de carga, vacío y error en todas las vistas |
| Tipo | Feature |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `ux` |
| Depende de | [F3-05](../F3-datos-reales/F3-05-home-kpis-reales.md), [F3-06](../F3-datos-reales/F3-06-logs-filtros-paginacion.md), [F3-07](../F3-datos-reales/F3-07-estado-servicios-health.md) |
| Agentes | `product-owner`, `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Componentes compartidos de estado. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Con datos reales aparecen tiempos de espera y fallos que hoy no existen. Cada bloque debe comunicarlos sin romper la página.

## Alcance

### Incluye

- `app-empty-state` y `app-error-state` (con botón Reintentar) en `shared/components` y su barrel
- Skeletons existentes usados en la carga inicial
- Mensajes en español escritos desde el punto de vista del operador

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/shared/components/empty-state/*` (nuevo)
- `src/app/shared/components/error-state/*` (nuevo)
- `src/app/shared/components/index.ts`
- Páginas del dashboard

## Criterios de aceptación

- [ ] **AC1** — Con el BFF caído, cada tarjeta muestra error y Reintentar, y la navegación sigue funcionando
- [ ] **AC2** — Reintentar solo vuelve a pedir el bloque afectado
- [ ] **AC3** — Los nuevos componentes aparecen en Showcase

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Revisión UX del Product Owner
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `empty-state.component.spec.ts`, `error-state.component.spec.ts` | Render y evento de reintento | Componente |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Componentes compartidos

### Usuario

- [ ] `docs/user/manual-operador.md` § Qué hacer si no cargan los datos

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Mensajes claros de carga, vacío y error con opción de reintentar en cada sección. (F3-09)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
