# Epic F2 · Autenticación

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Tipo | Epic |
| Fechas | 2 nov – 13 nov 2026 |
| Sprint | Sprint 2–3 |
| Fix version | 0.1.0 |

## Objetivo

Login y logout reales contra Mercury a través del BFF, con sesión en Redis, rutas protegidas y manejo de expiración.

## Criterios de salida

- [ ] Sin sesión, `/dashboard` redirige a `/login`
- [ ] La sesión se mantiene tras recargar y tras reiniciar el BFF
- [ ] Un 401 muestra aviso y devuelve al login
- [ ] Cobertura global ≥ 85 %

## Tareas

| ID | Tarea | Prioridad | FE | BE | Infra | Est. | Depende de | Estado |
|---|---|---|:-:|:-:|:-:|---|---|:-:|
| [F2-01](F2-01-validar-oauth-sesion-cookie.md) | Validar el flujo OAuth del BFF y emitir sesión por cookie httpOnly | Critical |  | ● | ● | 2d | F0-08 | 🔄 |
| [F2-02](F2-02-endpoint-sesion-actual.md) | Endpoint de sesión actual GET /mrc/api/v1/auth/me | Major |  | ● |  | 0.5d | F2-01 | ✅ |
| [F2-03](F2-03-auth-service-signals.md) | AuthService con signals | Critical | ● |  |  | 1.5d | F1-03, F2-02 | ⬜ |
| [F2-04](F2-04-pagina-login.md) | Página de inicio de sesión | Critical | ● |  |  | 2d | F2-03 | ⬜ |
| [F2-05](F2-05-guards-reales.md) | authGuard real y guestGuard | Critical | ● |  |  | 0.5d | F2-03, F2-04 | ⬜ |
| [F2-06](F2-06-auth-interceptor-401.md) | Interceptor de autenticación y manejo de sesión expirada | Critical | ● |  |  | 1d | F2-03 | ⬜ |
| [F2-07](F2-07-logout-perfil-navbar.md) | Cerrar sesión y perfil de usuario en la navbar | Major | ● | ● |  | 1d | F2-03, F2-01 | ⬜ |
