# Contribuir

## Flujo

1. Una rama por tarea, desde la rama integradora vigente: `feat/…`, `fix/…`, `docs/…`, `test/…`, `ci/…`, `chore/…`.
2. Commits pequeños y revisables con **Conventional Commits**.
3. PR con la [plantilla](../../.github/pull_request_template.md); CI en verde (build SSR, cobertura ≥ 85 %, `gitleaks`).
4. Entrada en `CHANGELOG.md` bajo `[Unreleased]` y documentación al día.

## Conventional Commits

`<tipo>(<ámbito opcional>): <descripción en imperativo>`

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un defecto |
| `refactor` | Cambio interno sin cambio de comportamiento |
| `test` | Pruebas |
| `docs` | Documentación |
| `ci` | Pipeline y automatización |
| `build` | Dependencias y herramientas de build |
| `chore` | Mantenimiento |

Un cambio incompatible lleva `!` tras el tipo (`feat!: …`) y un pie `BREAKING CHANGE:`.
Ejemplos: `fix(f0-04): guard localStorage in ApiService during SSR`, `ci: cache the pnpm store`.

## CHANGELOG

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y SemVer. Cada entrada termina con el ID de la tarea. Secciones permitidas: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
