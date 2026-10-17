# [F5-05] Documentación de usuario: manual del operador

> Epic: [F5 · Release MVP v0.1.0](../F5-release/EPIC.md) · Sprint 5 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Documentación de usuario: manual del operador |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | Docs |
| Estimación | 1.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 5 |
| Etiquetas | `docs`, `user` |
| Depende de | [F3-09](../F3-datos-reales/F3-09-estados-carga-vacio-error.md), [F2-07](../F2-autenticacion/F2-07-logout-perfil-navbar.md) |
| Agentes | `product-owner` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Consolidar las secciones que cada tarea agregó a `docs/user/manual-operador.md` en un manual completo, revisado y con capturas.

## Alcance

### Incluye

- Índice: acceso, página principal, KPIs, mensajes, estado de servicios, preferencias, problemas frecuentes, glosario
- Capturas en tema claro
- Preguntas frecuentes a partir de la UAT
- Versión exportable a PDF para distribución

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `docs/user/manual-operador.md`
- `docs/user/img/*`

## Criterios de aceptación

- [ ] **AC1** — Un operador sin capacitación completa las tareas de UAT usando solo el manual
- [ ] **AC2** — Cada pantalla del MVP tiene su sección

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Aprobado por Product Owner
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.


## Documentación

### Técnica

- No requiere cambios en documentación técnica.

### Usuario

- [ ] `docs/user/manual-operador.md` completo

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Manual del operador. (F5-05)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Operadores | Entrega del manual | Con la invitación a UAT |
