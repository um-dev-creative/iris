# [F0-04] Corregir acceso a localStorage en ApiService durante SSR

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Corregir acceso a localStorage en ApiService durante SSR |
| Tipo | Bug |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `frontend`, `ssr`, `bug` |
| Depende de | [F0-02](../F0-saneamiento/F0-02-integrar-rama-mer-1.md) |
| Agentes | `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | `ApiService` protege el acceso a `localStorage`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

`src/app/core/services/api.service.ts` líneas 24 y 85 usan `localStorage` sin comprobar la plataforma. En SSR esto lanza `ReferenceError: localStorage is not defined`. `SUCCESS_SUMMARY.md` lo da por resuelto pero el código no lo está. `ThemeService` sí lo protege.

## Alcance

### Incluye

- Usar `isPlatformBrowser(inject(PLATFORM_ID))` en `loadConfig` y `updateConfig`
- Revisar el resto de `src/app` en busca de `window`, `document` o `localStorage` sin protección
- Corregir la afirmación en `SUCCESS_SUMMARY.md`

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `src/app/core/services/api.service.ts`
- `SUCCESS_SUMMARY.md`

## Criterios de aceptación

- [ ] **AC1** — `pnpm run build:ssr` y el render de `/dashboard` en el servidor no producen errores en consola
- [x] **AC2** — En el navegador, la configuración guardada en Settings persiste tras recargar
- [x] **AC3** — En SSR se usa la configuración por defecto del entorno

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Búsqueda `grep -rn "localStorage\|window\." src/app` revisada y documentada en el PR
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
| `api.service.spec.ts` | Plataforma navegador vs servidor; config guardada válida, inválida (JSON roto) y ausente; headers por `authType`; construcción de params | Unitaria |

## Documentación

### Técnica

- [x] `docs/technical/frontend.md` § SSR: regla de acceso a APIs del navegador

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Fixed`:

```md
- El renderizado en servidor ya no falla al leer la configuración de API guardada en el navegador. (F0-04)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| QA | Re-probar el render SSR de `/dashboard` | Al desplegar en dev |

## Reporte de validación

Validado el 2026-10-17 en la rama `fix/f0-04-ssr-localstorage-apiservice`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `build:ssr` sin errores en consola | PASS (parcial) | `ENVM=development pnpm run build:ssr` termina sin errores ni menciones a `localStorage`. Un render real de `/dashboard` con `renderApplication` no pude validarlo: mi script ad hoc falla con `NG0201` por cargar otra instancia de Angular; el servidor de producción sirve la SPA (CSR) y no renderiza SSR en tiempo de ejecución |
| AC2 la configuración guardada persiste tras recargar | PASS | Prueba "persiste los cambios y sobrevive a una recarga" (`api.service.spec.ts`, 14/14 pruebas) |
| AC3 en SSR se usa la configuración por defecto | PASS | Pruebas con `PLATFORM_ID = 'server'` y `localStorage` indefinido: no lanzan y no leen lo guardado |

Hecho: `ApiService` usa `isPlatformBrowser`; revisión de `localStorage|window.|document.` documentada en `docs/technical/frontend.md` (solo `ThemeService` y `SidebarComponent`, ya protegidos); corregida la afirmación en `docs/history/SUCCESS_SUMMARY.md`. Hallazgo adicional corregido: `main.server.ts` ignoraba el `BootstrapContext` que Angular 22 exige para renderizar. Pendiente: QA re-probar el render SSR al desplegar.
