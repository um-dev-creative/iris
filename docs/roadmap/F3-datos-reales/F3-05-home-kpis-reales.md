# [F3-05] Home con KPIs y mensajes recientes reales

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Home con KPIs y mensajes recientes reales |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `dashboard` |
| Depende de | [F3-04](../F3-datos-reales/F3-04-monitoring-api-service-mock-flag.md), [F3-02](../F3-datos-reales/F3-02-endpoints-bff-monitoreo.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | `home-page` y `kpi-card` consumen el store. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

La página principal debe mostrar los 4 KPIs (mensajes 24 h, tasa de entrega, latencia promedio, errores activos) con sus sparklines y los últimos 10 mensajes reales.

## Alcance

### Incluye

- Conectar `kpi-card` y `sparkline` al store
- Tabla de mensajes recientes con enlace a la vista de datos filtrada
- Indicador "Actualizado hace X"

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `home-page.component.*`
- `kpi-card.component.ts`
- `sparkline.component.ts`

## Criterios de aceptación

- [ ] **AC1** — Los valores coinciden con la respuesta del BFF para el mismo instante
- [ ] **AC2** — La tendencia se calcula según la definición del contrato
- [ ] **AC3** — Un KPI que falla no impide ver los demás

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Validado por Product Owner contra datos de QA
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `home-page.component.spec.ts` | Render con datos, KPI fallido aislado, enlace a datos | Componente |

## Documentación

### Técnica

- No requiere cambios en documentación técnica.

### Usuario

- [ ] `docs/user/manual-operador.md` § Página principal: qué significa cada KPI y cómo se calcula

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- La página principal muestra KPIs y mensajes reales de las últimas 24 horas. (F3-05)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Operadores | Definición de cada indicador | Release notes v0.1.0 |
