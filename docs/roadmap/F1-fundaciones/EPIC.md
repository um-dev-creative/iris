# Epic F1 · Fundaciones (IRIS-001)

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Tipo | Epic |
| Fechas | 2 nov – 6 nov 2026 |
| Sprint | Sprint 2 |
| Fix version | 0.1.0 |

Story de origen: [IRIS-001](../../stories/IRIS-001-proxy-route-config-shared.md)

## Objetivo

Implementar la story IRIS-001: proxy de desarrollo, rutas tipadas, configuración inyectable y utilidades compartidas, base para conectar el frontend al BFF.

## Criterios de salida

- [ ] AC1–AC4 de `docs/stories/IRIS-001-proxy-route-config-shared.md` marcados
- [ ] El frontend usa URLs relativas al BFF en todos los entornos
- [ ] Cobertura global ≥ 85 %

## Tareas

| ID | Tarea | Prioridad | FE | BE | Infra | Est. | Depende de | Estado |
|---|---|---|:-:|:-:|:-:|---|---|:-:|
| [F1-01](F1-01-proxy-desarrollo-bff.md) | Proxy de desarrollo de ng serve hacia el BFF | Major | ● |  |  | 0.5d | F0-03 | ✅ |
| [F1-02](F1-02-route-paths-constantes.md) | Constantes de rutas ROUTE_PATHS | Normal | ● |  |  | 1d | F0-07 | ⬜ |
| [F1-03](F1-03-tokens-app-config.md) | Tokens de configuración APP_CONFIG y API_BASE_URL | Major | ● |  |  | 1d | F0-07 | ⬜ |
| [F1-04](F1-04-shared-utils.md) | Utilidades compartidas en shared/utils | Normal | ● |  |  | 1d | F0-07 | ⬜ |
| [F1-05](F1-05-normalizar-entornos.md) | Normalizar entornos y usar URL relativa al BFF | Major | ● | ● | ● | 1d | F1-01, F1-03 | ⬜ |
