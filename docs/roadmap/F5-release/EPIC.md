# Epic F5 · Release MVP v0.1.0

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Tipo | Epic |
| Fechas | 23 nov – 4 dic 2026 |
| Sprint | Sprint 5 |
| Fix version | 0.1.0 |

## Objetivo

Endurecer, empaquetar, documentar para el usuario final, validar con operadores y publicar la versión 0.1.0.

## Criterios de salida

- [ ] Despliegue en QA desde CI sin pasos manuales
- [ ] UAT firmado por el Product Owner
- [ ] Tag `v0.1.0`, CHANGELOG y release notes publicados y comunicados

## Tareas

| ID | Tarea | Prioridad | FE | BE | Infra | Est. | Depende de |
|---|---|---|:-:|:-:|:-:|---|---|
| [F5-01](F5-01-docker-despliegue-qa.md) | Imagen Docker y despliegue a QA desde CI | Critical |  | ● | ● | 2d | F0-03, F1-05 |
| [F5-02](F5-02-hardening-seguridad.md) | Hardening de seguridad por entorno | Critical | ● | ● | ● | 2d | F0-03 |
| [F5-03](F5-03-logging-estructurado.md) | Logging estructurado y correlation id | Major | ● | ● | ● | 1d | F0-03 |
| [F5-04](F5-04-flags-produccion.md) | Ocultar Showcase y configuración de API en producción | Major | ● |  |  | 0.5d | F1-03 |
| [F5-05](F5-05-manual-operador.md) | Documentación de usuario: manual del operador | Major |  |  |  | 1.5d | F3-09, F2-07 |
| [F5-06](F5-06-uat.md) | Pruebas de aceptación de usuario (UAT) | Critical | ● | ● |  | 3d | F5-01, F5-02, F5-05 |
| [F5-07](F5-07-release-v0-1-0.md) | Publicar la versión v0.1.0 | Critical |  |  | ● | 0.5d | F5-06, F4-01, F4-04 |
