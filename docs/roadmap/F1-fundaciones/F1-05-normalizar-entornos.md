# [F1-05] Normalizar entornos y usar URL relativa al BFF

> Epic: [F1 · Fundaciones (IRIS-001)](../F1-fundaciones/EPIC.md) · Sprint 2 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Normalizar entornos y usar URL relativa al BFF |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | FE + BE + Infra |
| Estimación | 1d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2 |
| Etiquetas | `frontend`, `backend`, `config` |
| Depende de | [F1-01](../F1-fundaciones/F1-01-proxy-desarrollo-bff.md), [F1-03](../F1-fundaciones/F1-03-tokens-app-config.md) |
| Agentes | `repo-requirements-analyst`, `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Entornos `dev`, `qa`, `*-cloud`, `prod` con `apiBaseUrl` relativo. |
| Backend (BFF Node) | **Sí** | Configs `server/config/*.json` alineadas con los mismos nombres de entorno. |
| Infra / DevOps / Repo | **Sí** | Configuraciones de build en `angular.json`. |

## Descripción

Hay seis archivos `environment*.ts` pero `angular.json` solo define `production` y `development`, y todos apuntan a `jsonplaceholder.typicode.com`. El script `build` usa `$ENVM` con valores que no existen.

## Alcance

### Incluye

- Configuraciones `dev`, `qa`, `dev-cloud`, `qa-cloud`, `production` en `angular.json` con `fileReplacements`
- `apiBaseUrl: '/mrc/api/v1'` en todos los entornos; quitar `apiKey` de los archivos de entorno
- Alinear `server/config/{dev,qa,production}.json` con los mismos nombres
- Tabla de equivalencias `ENVM` ↔ configuración Angular ↔ config del BFF

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `angular.json`
- `src/environments/*`
- `server/config/*.json`
- `package.json`

## Criterios de aceptación

- [ ] **AC1** — `ENVM=qa pnpm run build:ssr` funciona para cada entorno
- [ ] **AC2** — Ningún entorno referencia `jsonplaceholder`
- [ ] **AC3** — El navegador nunca recibe secretos ni API keys desde `environment*.ts`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Tabla de entornos publicada
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI | Matriz de build por entorno | Build |

## Documentación

### Técnica

- [ ] `docs/technical/environments.md`: tabla de entornos, URLs, certificados y variables

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- Todos los entornos consumen la API a través del BFF con URL relativa; se agregaron configuraciones de build para dev, qa y cloud. (F1-05)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| DevOps / Plataforma | Nuevos valores válidos de `ENVM` | Antes del merge |
