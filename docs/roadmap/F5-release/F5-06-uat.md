# [F5-06] Pruebas de aceptación de usuario (UAT)

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Pruebas de aceptación de usuario (UAT) |
| Tipo | Task |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE + BE |
| Estimación | 3d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `uat`, `qa` |
| Depende de | [F5-01](../F5-release/F5-01-docker-despliegue-qa.md), [F5-02](../F5-release/F5-02-hardening-seguridad.md), [F5-05](../F5-release/F5-05-manual-operador.md) |
| Agentes | `product-owner`, `test-writer`, `manager-project` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Correcciones según hallazgos. |
| Backend (BFF Node) | **Sí** | Correcciones según hallazgos. |
| Infra / DevOps / Repo | No | — |

## Descripción

Validar con operadores reales en QA que el MVP cumple su objetivo antes de liberar.

## Alcance

### Incluye

- Guion de UAT con 8–10 tareas reales (p. ej. "encuentra los mensajes fallidos de WhatsApp de la última hora")
- Sesiones con al menos 3 operadores
- Registro de hallazgos como tickets YouTrack con severidad
- Corrección de hallazgos bloqueantes y re-prueba

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `docs/uat/guion-uat.md` (nuevo)
- `docs/uat/resultados-v0.1.0.md` (nuevo)

## Criterios de aceptación

- [ ] **AC1** — ≥ 90 % de las tareas del guion completadas sin ayuda
- [ ] **AC2** — 0 hallazgos bloqueantes abiertos
- [ ] **AC3** — Acta de aceptación firmada por el Product Owner

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Cobertura sigue ≥ 85 % tras las correcciones
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
| UAT | Guion manual con operadores | Aceptación |
| Suites existentes | Regresión de las correcciones | Unitaria/E2E |

## Documentación

### Técnica

- [ ] `docs/uat/resultados-v0.1.0.md`

### Usuario

- [ ] FAQ del manual actualizado con dudas de la UAT

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Fixed`:

```md
- Correcciones derivadas de la UAT (detallar cada una con su ticket). (F5-06)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Operadores | Invitación, fechas y guion | 1 semana antes · correo |
| Product Owner / Dirección | Resultado de la UAT y decisión de salida | Al cierre · reunión |
