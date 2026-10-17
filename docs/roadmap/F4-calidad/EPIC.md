# Epic F4 · Calidad end-to-end

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Tipo | Epic |
| Fechas | 16 nov – 27 nov 2026 |
| Sprint | Sprint 4 |
| Fix version | 0.1.0 |

## Objetivo

Complementar el gate de cobertura unitaria con pruebas e2e, contratos, accesibilidad, rendimiento y reglas de protección de rama.

## Criterios de salida

- [ ] Smoke e2e verde en CI
- [ ] Contrato BFF ↔ Mercury verificado en CI
- [ ] Presupuestos de rendimiento y a11y definidos y en verde
- [ ] `main` protegida

## Tareas

| ID | Tarea | Prioridad | FE | BE | Infra | Est. | Depende de |
|---|---|---|:-:|:-:|:-:|---|---|
| [F4-01](F4-01-smoke-e2e-playwright.md) | Smoke e2e con Playwright | Critical | ● | ● | ● | 2d | F2-07, F3-06, F0-09 |
| [F4-02](F4-02-pruebas-contrato.md) | Pruebas de contrato BFF ↔ OpenAPI | Major |  | ● | ● | 1d | F3-02 |
| [F4-03](F4-03-a11y-performance-budget.md) | Presupuestos de accesibilidad y rendimiento | Normal | ● |  | ● | 1d | F4-01 |
| [F4-04](F4-04-proteccion-rama-cobertura-pr.md) | Protección de main y reporte de cobertura en PR | Major |  |  | ● | 0.5d | F0-09 |
