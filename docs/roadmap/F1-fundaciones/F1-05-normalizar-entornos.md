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

- [x] **AC1** — `ENVM=qa pnpm run build:ssr` funciona para cada entorno
- [x] **AC2** — Ningún entorno referencia `jsonplaceholder`
- [x] **AC3** — El navegador nunca recibe secretos ni API keys desde `environment*.ts`

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Tabla de entornos publicada
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
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

- [x] `docs/technical/environments.md`: tabla de entornos, URLs, certificados y variables

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

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f1-05-normalizar-entornos` (apilada sobre F1-04).

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `ENVM=<x> pnpm run build:ssr` funciona para cada entorno | PASS | Ejecutado localmente con `development`, `dev`, `qa`, `dev-cloud`, `qa-cloud` y `production`: los seis terminan con código 0 y sin errores ni avisos, y generan el `index*.html`. El bundle de `production` tiene hash distinto (`production: true`); los demás comparten bundle porque sus valores son iguales. `ENVM=prod` falla con `Configuration 'prod' ... is not set` (el nombre válido es `production`). CI: nuevo job `Build por entorno` con matriz de los seis valores |
| AC2 ningún entorno referencia `jsonplaceholder` | PASS | `environments.spec.ts` (6 entornos × 3 comprobaciones) y `grep -rl jsonplaceholder src angular.json` → solo la propia prueba. Quedaban menciones en `CLAUDE.md`/`AGENTS.md`; actualizadas |
| AC3 el navegador no recibe secretos ni API keys desde `environment*.ts` | PASS | Los 6 archivos solo tienen `production` y `apiBaseUrl: '/mrc/api/v1'`; `apiKey` eliminado; la prueba rechaza claves con `key/secret/token/password` y URLs absolutas |

Hecho: configuraciones `dev`, `qa`, `dev-cloud`, `qa-cloud` y `production` (con `fileReplacements`) en los targets `build` y `server` más `serve`; `production` antes usaba `environment.ts` porque no tenía reemplazo; `build:ssr` ahora pasa `ENVM` también al target `server` (antes lo compilaba siempre como `production` y sobrescribía el build de `ENVM`); `docs/technical/environments.md` con la tabla `ENVM` ↔ configuración Angular ↔ archivo ↔ BFF, certificados y variables. Frontend: 242 pruebas, líneas 99.5 %; BFF: 75 pruebas.

Desviación (capa BE): la tarea pedía alinear `server/config/{dev,qa,production}.json`, pero esos archivos ya no existen: el BFF se configura solo con variables de entorno (F0-03). La alineación quedó documentada en la tabla de `environments.md`; no hubo cambios de backend ni en Mercury. Pendiente: avisar a DevOps/Plataforma de los nuevos valores válidos de `ENVM` antes del merge, y hallazgo para F2: el BFF exige la cabecera `x-iris-csrf: 1` en `/mrc/api/**` y `/bkd/api/**` y `ApiService` aún no la envía.
