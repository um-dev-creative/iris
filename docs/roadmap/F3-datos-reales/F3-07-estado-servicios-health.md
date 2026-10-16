# [F3-07] Estado de servicios alimentado por health checks

> Epic: [F3 · Datos reales de monitoreo](../F3-datos-reales/EPIC.md) · Sprint 3–4 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Estado de servicios alimentado por health checks |
| Tipo | Feature |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE + BE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 3–4 |
| Etiquetas | `frontend`, `backend`, `monitoring` |
| Depende de | [F3-02](../F3-datos-reales/F3-02-endpoints-bff-monitoreo.md), [F3-04](../F3-datos-reales/F3-04-monitoring-api-service-mock-flag.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | `service-status-card` consume `/monitoring/services`. |
| Backend (BFF Node) | **Sí** | El endpoint combina `/health`, `/health/redis` y el estado de Mercury/proveedores. |
| Infra / DevOps / Repo | No | — |

## Descripción

Los 6 servicios y su estado están escritos a mano. Deben reflejar el estado real, incluido el propio BFF y Redis.

## Alcance

### Incluye

- Estado `operational` / `degraded` / `down` con uptime y latencia
- Banner global según el peor estado
- Hora de la última verificación por servicio

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `service-status-card.component.ts`
- `home-page.component.html`
- `server/controller/monitoring.controller.js`

## Criterios de aceptación

- [ ] **AC1** — Detener Redis en dev cambia su tarjeta a `down` en el siguiente refresco
- [ ] **AC2** — El banner muestra "Degradación parcial" si algún servicio está degradado

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

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
| `service-status-card.component.spec.ts` | Tres estados y banner | Componente |
| `monitoring.controller.spec.js` | Combinación de estados | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/backend.md` § Health checks

### Usuario

- [ ] `docs/user/manual-operador.md` § Estado de servicios: significado de cada estado

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- El estado de servicios refleja verificaciones reales del BFF, Redis y proveedores. (F3-07)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| DevOps / Plataforma | Endpoints de health disponibles para su monitoreo | Al desplegar en QA |
