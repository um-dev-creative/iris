# [F0-10] Crear CHANGELOG, actualizar README y plantillas de PR

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Crear CHANGELOG, actualizar README y plantillas de PR |
| Tipo | Task |
| Prioridad | Major |
| MoSCoW | must |
| Subsistema | Infra |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `docs`, `process` |
| Depende de | [F0-05](../F0-saneamiento/F0-05-higiene-repositorio.md) |
| Agentes | `developer`, `manager-project` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | **Sí** | Plantillas de GitHub. |

## Descripción

No existe `CHANGELOG.md` y el README describe solo `npm start`. Los interesados no tienen un lugar único para conocer qué cambió.

## Alcance

### Incluye

- `CHANGELOG.md` en formato *Keep a Changelog* + SemVer, con historial desde febrero 2026
- README: requisitos, setup con pnpm, scripts integrados, enlaces a docs técnicas, de usuario y roadmap
- `.github/pull_request_template.md` con checklist: AC, cobertura ≥ 85 %, CHANGELOG, docs técnica/usuario, comunicación
- Convención de commits (Conventional Commits) documentada

### No incluye

- Nada fuera de lo listado en *Incluye*.

### Archivos impactados (estimado)

- `CHANGELOG.md`
- `README.md`
- `.github/pull_request_template.md`

## Criterios de aceptación

- [ ] **AC1** — `CHANGELOG.md` tiene sección `[Unreleased]` y versiones previas con fecha
- [ ] **AC2** — El README permite levantar el proyecto desde cero siguiendo solo sus pasos
- [ ] **AC3** — Los PR nuevos se abren con la plantilla

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Un desarrollador ajeno al proyecto valida el README
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.


## Documentación

### Técnica

- [ ] README
- [ ] `CONTRIBUTING.md` (opcional) con flujo de ramas y commits

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- `CHANGELOG.md`, plantilla de pull request y README actualizado. (F0-10)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Todos los interesados | Dónde consultar cambios (`CHANGELOG.md`) y el roadmap | Al hacer merge · correo de kickoff |
