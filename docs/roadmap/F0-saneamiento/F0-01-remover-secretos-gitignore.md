# [F0-01] Remover secretos del repositorio y endurecer .gitignore

> Epic: [F0 · Saneamiento, pruebas y CI](../F0-saneamiento/EPIC.md) · Sprint 1 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Remover secretos del repositorio y endurecer .gitignore |
| Tipo | Task |
| Prioridad | Show-stopper |
| MoSCoW | must |
| Subsistema | BE + Infra |
| Estimación | 0.5d |
| Fix version | 0.1.0 |
| Sprint | Sprint 1 |
| Etiquetas | `security`, `repo` |
| Depende de | — |
| Agentes | `manager-project`, `developer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | No | — |
| Backend (BFF Node) | **Sí** | Variables de arranque (`default.env`) pasan a un `.example` sin valores. |
| Infra / DevOps / Repo | **Sí** | Rotación del `VAULT_TOKEN` y reglas de `.gitignore`. |

## Descripción

`default.env` está agregado al índice de git con `VAULT_TOKEN` cargado (95 caracteres) y `.gitignore` no excluye archivos `*.env` ni las llaves privadas de `ssl/`. Un commit o push en este estado expone credenciales de Vault y llaves TLS.

## Alcance

### Incluye

- Sacar `default.env` del índice (`git restore --staged default.env`)
- Crear `default.env.example` con las 6 variables y valores vacíos o de ejemplo
- Agregar a `.gitignore`: `*.env` (con excepción `!*.env.example`), `ssl/*.key`, `ssl/*.pem`, `*.log`, `.playwright-mcp/`
- Verificar con `git log --all -- default.env ssl/` que nunca se publicaron; si se publicaron, rotar el token y regenerar certificados
- Agregar un hook `pre-commit` o paso de CI con `gitleaks` para detectar secretos

### No incluye

- Migrar la gestión de secretos a otra herramienta distinta de Vault

### Archivos impactados (estimado)

- `.gitignore`
- `default.env` → `default.env.example`
- `.gitleaks.toml` (nuevo)
- `DEVELOPMENT_SETUP.md`

## Criterios de aceptación

- [ ] **AC1** — `git ls-files` no lista `default.env`, `*.key` ni `*.log`
- [ ] **AC2** — `default.env.example` existe y documenta cada variable con un comentario
- [ ] **AC3** — `gitleaks detect` sobre el repositorio no reporta hallazgos
- [ ] **AC4** — Si hubo exposición, existe evidencia de rotación del token (ticket de Seguridad enlazado)

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] El equipo fue avisado de crear su `default.env` local a partir del `.example`
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea no agrega lógica de aplicación. Debe verificarse que el gate de 85 % siga en verde en CI tras el merge.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| CI / pre-commit | Escaneo `gitleaks` sin hallazgos | Seguridad estática |

## Documentación

### Técnica

- [ ] `DEVELOPMENT_SETUP.md`: sección *Variables de entorno* con la tabla de variables y cómo obtener el token de Vault
- [ ] `docs/technical/README.md` § Seguridad: política de secretos

### Usuario

- No aplica: el cambio no es visible para el operador.

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Security`:

```md
- Se retiró `default.env` del control de versiones, se agregó `default.env.example` y se ampliaron las exclusiones de `.gitignore` para secretos y llaves TLS. (F0-01)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Equipo de desarrollo | Crear `default.env` local desde el ejemplo; no commitear `.env` | Al hacer merge · canal del equipo |
| Seguridad | Notificar posible exposición y confirmar rotación del token | Inmediato si `git log` muestra exposición |

## Riesgos y notas

- Si el token ya está en un remoto, la rotación es obligatoria aunque se reescriba el historial.
