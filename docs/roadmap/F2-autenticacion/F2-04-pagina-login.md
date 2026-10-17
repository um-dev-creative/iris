# [F2-04] Página de inicio de sesión

> Epic: [F2 · Autenticación](../F2-autenticacion/EPIC.md) · Sprint 2–3 · Versión objetivo `0.1.0`

## Campos YouTrack

| Campo | Valor |
|---|---|
| Proyecto | IRIS |
| Resumen | Página de inicio de sesión |
| Tipo | Feature |
| Prioridad | Critical |
| MoSCoW | must |
| Subsistema | FE |
| Estimación | 2d |
| Fix version | 0.1.0 |
| Sprint | Sprint 2–3 |
| Etiquetas | `frontend`, `auth`, `ux` |
| Depende de | [F2-03](../F2-autenticacion/F2-03-auth-service-signals.md) |
| Agentes | `product-owner`, `developer`, `test-writer` |

## Capas impactadas

| Capa | ¿Requiere cambios? | Detalle |
|---|:---:|---|
| Frontend (Angular) | **Sí** | Nueva feature `features/auth` con `LoginPageComponent`. |
| Backend (BFF Node) | No | — |
| Infra / DevOps / Repo | No | — |

## Descripción

Pantalla pública de acceso con el design system de Iris (tokens oklch, dark mode, componentes `shared`).

## Alcance

### Incluye

- Ruta `/login` fuera del `LayoutComponent`
- Formulario reactivo: usuario y contraseña, validación requerida, mostrar/ocultar contraseña
- Estado de envío con botón deshabilitado y spinner
- Mensaje de error genérico ante 401 y mensaje de servicio no disponible ante 5xx/red
- Redirección a la URL original (`returnUrl`) o a `/dashboard`
- Accesible: labels, foco en el primer error, navegable con teclado

### No incluye

- Recuperar contraseña y registro (los endpoints existen pero quedan fuera del MVP)

### Archivos impactados (estimado)

- `src/app/features/auth/**` (nuevo)
- `src/app/app.routes.ts`

## Criterios de aceptación

- [ ] **AC1** — Con credenciales válidas se navega a `returnUrl` o `/dashboard`
- [ ] **AC2** — Con credenciales inválidas se muestra "Usuario o contraseña incorrectos" sin indicar cuál
- [ ] **AC3** — No se puede enviar el formulario vacío
- [ ] **AC4** — Se ve correctamente en claro, oscuro y a 375 px de ancho

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [ ] Revisión visual del Product Owner
- [ ] Capturas en claro y oscuro adjuntas al PR
- [ ] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [ ] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [ ] Documentación técnica actualizada (ver abajo)
- [ ] Documentación de usuario actualizada (ver abajo)
- [ ] Comunicación a interesados enviada (ver abajo)

## Cobertura de pruebas (umbral ≥ 85 %)

Esta tarea agrega o modifica código ejecutable. Debe cumplir la [Política de cobertura](../COVERAGE_POLICY.md):

- Cobertura global de `src/app` y `server/` **≥ 85 %** en líneas, sentencias, funciones y ramas después del merge.
- Cobertura del código nuevo o modificado en el PR **≥ 85 %** (reporte de diff en el PR).
- Comandos: `pnpm test` (frontend) · `pnpm test:server` (backend) · `pnpm test:all`.

| Suite / archivo | Qué cubre | Tipo |
|---|---|---|
| `login-page.component.spec.ts` | Validación, envío, errores 401/5xx, redirección con y sin `returnUrl` | Componente |

## Documentación

### Técnica

- [ ] `docs/technical/frontend.md` § Feature auth

### Usuario

- [ ] `docs/user/manual-operador.md` § Iniciar sesión: pasos, mensajes de error y qué hacer

## CHANGELOG

Agregar en `CHANGELOG.md` → `[Unreleased]` → `### Added`:

```md
- Pantalla de inicio de sesión. (F2-04)
```

## Comunicación a interesados

| A quién | Qué informar | Cuándo · canal |
|---|---|---|
| Operadores | Iris pedirá usuario y contraseña de Mercury | Release notes v0.1.0 |
| Product Owner | Demo de la pantalla | Fin de sprint |
