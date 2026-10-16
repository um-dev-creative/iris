# [F5-04] Ocultar Showcase y configuración de API en producción

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Ocultar Showcase y configuración de API en producción |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `frontend`, `config` |
| Depende de | [F1-03](../F1-fundaciones/F1-03-tokens-app-config.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Rutas y enlaces condicionados por `APP_CONFIG.features`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

La página Showcase es un catálogo de componentes y Settings permite cambiar la URL de la API y guardar una API key en `localStorage`. Ninguna de las dos debe estar disponible para operadores.

## Alcance

### Incluye

- `features.showcase` y `features.apiSettings` en `AppConfig` (false en `qa` y `production`)
- Rutas no registradas y enlaces ocultos en el sidebar cuando el flag está apagado
- Settings conserva solo preferencias del usuario (tema)

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `dashboard.routes.ts`
- `sidebar.component.ts`
- `settings-page.component.ts`
- `src/environments/*`

## Criterios de aceptación

- [ ] **AC1** — En el build de producción, `/dashboard/showcase` redirige a la home
- [ ] **AC2** — No existe ningún campo para ingresar API keys en producción

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

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
| `dashboard.routes.spec.ts` | Rutas según flags | Integración |
| `sidebar.component.spec.ts` | Enlaces según flags | Componente |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Feature flags

### Usuario

- [ ] `docs/user/manual-operador.md` § Preferencias

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- Las herramientas de desarrollo (Showcase, configuración de API) no están disponibles en producción. (F5-04)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
