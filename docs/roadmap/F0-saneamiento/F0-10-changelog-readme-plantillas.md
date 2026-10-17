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

- [x] **AC1** — `CHANGELOG.md` tiene sección `[Unreleased]` y versiones previas con fecha
- [x] **AC2** — El README permite levantar el proyecto desde cero siguiendo solo sus pasos
- [ ] **AC3** — Los PR nuevos se abren con la plantilla

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Un desarrollador ajeno al proyecto valida el README
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.


## Documentación

### Técnica

- [x] README
- [x] `CONTRIBUTING.md` (opcional) con flujo de ramas y commits

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

## Reporte de validación

Validado el 2026-10-17 en la rama `docs/f0-10-changelog-readme-plantillas`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 `CHANGELOG.md` con `[Unreleased]` y versiones previas con fecha | PASS | `[Unreleased]`, `[0.0.3] - 2026-02-19`, `[0.0.2]` y `[0.0.1] - 2026-02-18`, con enlace de comparación desde `a54ad81` |
| AC2 el README permite levantar el proyecto desde cero | PASS (por mí) | Copia limpia del repo: `pnpm install`, `cp default.env.example default.env`, `ENVM=development pnpm serve:integrated` → `/` 200 y `/health` `{"status":"UP"}`. Enlaces relativos del README sin roturas. Falta que una persona ajena al proyecto lo valide (DoD) |
| AC3 los PR nuevos se abren con la plantilla | PENDIENTE | `.github/pull_request_template.md` creada; se comprueba al abrir el siguiente PR |

Hecho: README reescrito (requisitos, setup con pnpm, stack completo, scripts, pruebas y calidad, contribución, tabla de documentación), plantilla de PR con checklist (AC, cobertura ≥ 85 %, CHANGELOG, docs técnica y de usuario, comunicación) y `docs/technical/contributing.md` con Conventional Commits. El CHANGELOG ya existía desde F0-01/F0-02, con historial desde febrero 2026.
