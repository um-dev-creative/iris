# [F0-06] Migrar las pruebas a Vitest y configurar el quality gate de cobertura 85 %

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Migrar las pruebas a Vitest y configurar el quality gate de cobertura 85 % |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE + BE + Infra |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `testing`, `coverage`, `frontend`, `backend` |
| Depende de | [F0-02](../F0-saneamiento/F0-02-integrar-rama-mer-1.md) |
| Agentes | `test-writer`, `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Builder de pruebas de Angular pasa de Karma a Vitest. |
| Backend (BFF Node) | **Sí** | Vitest para `server/` con supertest. |
| Infra / DevOps / Repo | **Sí** | Scripts de cobertura y umbrales. |

## Descripción

El proyecto tiene Karma/Jasmine configurado pero ningún `*.spec.ts`. Angular 21 usa Vitest por defecto y el agente `test-writer` está definido para Vitest. Esta tarea instala la infraestructura y fija el umbral de 85 % que todas las tareas siguientes deben mantener.

## Alcance

### Incluye

- Cambiar `architect.test` en `angular.json` a `@angular/build:unit-test` con runner Vitest y cobertura v8
- Crear `vitest.server.config.mjs` para `server/**/*.spec.js` (entorno node)
- Umbrales 85 % en líneas, sentencias, funciones y ramas para ambos proyectos
- Scripts: `test`, `test:watch`, `test:server`, `test:all`, `coverage:merge`
- Eliminar dependencias de Karma/Jasmine y actualizar `tsconfig.spec.json`
- Documentar exclusiones permitidas (ver Política de cobertura)

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `angular.json`
- `package.json`
- `tsconfig.spec.json`
- `vitest.server.config.mjs` (nuevo)
- `docs/roadmap/COVERAGE_POLICY.md`

## Criterios de aceptación

- [ ] **AC1** — `pnpm test` ejecuta Vitest y genera `coverage/frontend/lcov.info`
- [ ] **AC2** — `pnpm test:server` genera `coverage/server/lcov.info`
- [ ] **AC3** — Ambos comandos fallan con código ≠ 0 si cualquier métrica < 85 %
- [ ] **AC4** — Una spec de ejemplo corre en cada proyecto

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Karma y Jasmine eliminados de `package.json`
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
| `app.component.spec.ts` | Spec mínima que valida la configuración del runner | Unitaria |
| `server/config/constants.util.spec.js` | Spec mínima del lado servidor | Unitaria |

## Documentación

### Técnica

- [ ] `docs/technical/testing.md`: cómo escribir y ejecutar pruebas, mocks de `HttpClient` y de Mercury
- [ ] `docs/roadmap/COVERAGE_POLICY.md` enlazado desde README

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Changed`:

```md
- Las pruebas usan Vitest con un umbral mínimo de cobertura del 85 % en frontend y backend. (F0-06)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo de desarrollo | Nueva regla: ningún PR baja la cobertura de 85 % | Al hacer merge · canal del equipo + README |
| QA | Ubicación de los reportes de cobertura en CI | Al hacer merge |

## Riesgos y notas

- Hasta completar F0-07 y F0-08 la cobertura global estará por debajo de 85 %; el gate se activa como bloqueante al cerrar esas tareas.
