# Epic F0 · Saneamiento, pruebas y CI

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Tipo | Epic |
| Fechas | 19 oct – 30 oct 2026 |
| Sprint | Sprint 1 |
| Fix version | 0.1.0 |

## Objetivo

Dejar el repositorio seguro, versionado, con un solo servidor y con el quality gate de cobertura ≥ 85 % activo antes de construir funcionalidad nueva.

## Criterios de salida

- [x] No hay secretos en el índice ni en el historial publicado
- [ ] La rama `mer-1` está integrada en `main` mediante PR
- [x] Existe un único punto de entrada del servidor
- [ ] CI ejecuta build SSR + pruebas y bloquea si la cobertura < 85 %
- [ ] `CHANGELOG.md`, README y plantillas de PR existen y están al día

## Tareas

Leyenda: ✅ completada · 🔄 en revisión · ⬜ pendiente

| ID | Tarea | Prioridad | FE | BE | Infra | Est. | Depende de | Estado |
|---|---|---|:-:|:-:|:-:|---|---|:-:|
| [F0-01](F0-01-remover-secretos-gitignore.md) | Remover secretos del repositorio y endurecer .gitignore | Show-stopper |  | ● | ● | 0.5d | — | ✅ |
| [F0-02](F0-02-integrar-rama-mer-1.md) | Commitear por bloques e integrar la rama mer-1 en main | Critical | ● | ● | ● | 1d | F0-01 | 🔄 PR #30 |
| [F0-03](F0-03-unificar-entrada-servidor.md) | Unificar el punto de entrada del servidor | Critical |  | ● | ● | 2d | F0-02 | ✅ |
| [F0-04](F0-04-ssr-localstorage-apiservice.md) | Corregir acceso a localStorage en ApiService durante SSR | Critical | ● |  |  | 0.5d | F0-02 | ⬜ |
| [F0-05](F0-05-higiene-repositorio.md) | Consolidar pnpm, limpiar archivos legados y reorganizar documentación | Major | ● |  | ● | 1d | F0-02 | ✅ |
| [F0-06](F0-06-vitest-quality-gate-85.md) | Migrar las pruebas a Vitest y configurar el quality gate de cobertura 85 % | Critical | ● | ● | ● | 2d | F0-02 | ⬜ |
| [F0-07](F0-07-backfill-pruebas-frontend.md) | Backfill de pruebas del frontend existente hasta 85 % | Critical | ● |  |  | 3d | F0-04, F0-06 | ⬜ |
| [F0-08](F0-08-backfill-pruebas-bff.md) | Backfill de pruebas del BFF hasta 85 % | Critical |  | ● |  | 4d | F0-03, F0-06 | ⬜ |
| [F0-09](F0-09-pipeline-ci.md) | Pipeline de CI con build SSR, pruebas y cobertura | Critical |  |  | ● | 1d | F0-06 | ⬜ |
| [F0-10](F0-10-changelog-readme-plantillas.md) | Crear CHANGELOG, actualizar README y plantillas de PR | Major |  |  | ● | 0.5d | F0-05 | ⬜ |
