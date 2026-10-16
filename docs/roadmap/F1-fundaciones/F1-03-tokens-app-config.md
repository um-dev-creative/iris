# [F1-03] Tokens de configuración APP_CONFIG y API_BASE_URL

> Epic: [F1 · Fundaciones (IRIS-001)](../F1-fundaciones/EPIC.md) · Sprint 2 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Tokens de configuración APP_CONFIG y API_BASE_URL |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2 |
| Etiquetas | `frontend`, `config`, `IRIS-001` |
| Depende de | [F0-07](../F0-saneamiento/F0-07-backfill-pruebas-frontend.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | `ApiService` consume configuración por DI. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Implementa AC3 de IRIS-001. `ApiService` y `SettingsPageComponent` importan `environment` directamente, lo que impide sustituir la configuración en pruebas y por entorno.

## Alcance

### Incluye

- `core/config/app-config.token.ts` con interfaz `AppConfig`, tokens `APP_CONFIG` y `API_BASE_URL`
- `provideAppConfig()` registrado en `app.config.ts` y en `app.config.server.ts`
- `ApiService` y Settings inyectan los tokens
- Agregar a `AppConfig` las claves que usarán fases siguientes: `features.mockData`, `features.showcase`, `pollingIntervalMs`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/core/config/*` (nuevo)
- `src/app/app.config.ts`
- `src/app/app.config.server.ts`
- `src/app/core/services/api.service.ts`
- `settings-page.component.ts`

## Criterios de aceptación

- [ ] **AC1** — Ningún archivo bajo `src/app` importa `environments/environment`, salvo `provideAppConfig`
- [ ] **AC2** — Agregar una variable nueva requiere solo `environment*.ts` + interfaz `AppConfig`
- [ ] **AC3** — Las pruebas pueden sobreescribir `API_BASE_URL`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Cobertura de `core/config` ≥ 85 %
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `app-config.token.spec.ts` | `provideAppConfig()` con distintos entornos | Unitaria |
| `api.service.spec.ts` | Usa `API_BASE_URL` inyectado | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Configuración: tabla de claves de `AppConfig`

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- La configuración de la aplicación se inyecta mediante `APP_CONFIG` y `API_BASE_URL`. (F1-03)
```

## Comunicación a interesados

Sin comunicación específica; se incluye en el [reporte semanal](../STAKEHOLDERS.md#reporte-semanal).
