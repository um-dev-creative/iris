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

- [x] **AC1** — Con credenciales válidas se navega a `returnUrl` o `/dashboard`
- [x] **AC2** — Con credenciales inválidas se muestra "Usuario o contraseña incorrectos" sin indicar cuál
- [x] **AC3** — No se puede enviar el formulario vacío
- [ ] **AC4** — Se ve correctamente en claro, oscuro y a 375 px de ancho

## Definition of Done

Cumple el [DoD general](../DEFINITION_OF_DONE.md) y además:

- [x] Revisión visual del Product Owner
- [ ] Capturas en claro y oscuro adjuntas al PR
- [x] Todos los criterios de aceptación verificados por `test-writer` con evidencia (reporte PASS/FAIL)
- [x] Entrada agregada en `CHANGELOG.md` bajo `[Unreleased]`
- [x] Documentación técnica actualizada (ver abajo)
- [x] Documentación de usuario actualizada (ver abajo)
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

- [x] `docs/technical/frontend.md` § Feature auth

### Usuario

- [x] `docs/user/manual-operador.md` § Iniciar sesión: pasos, mensajes de error y qué hacer

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

## Reporte de validación

Validado el 2026-10-17 en la rama `feat/f2-04-pagina-login` (apilada sobre F2-03).

| Criterio | Resultado | Evidencia |
|---|---|---|
| AC1 credenciales válidas → `returnUrl` o `/dashboard` | PASS | `login-page.component.spec.ts`: llama a `AuthService.login` con las credenciales y navega a `/dashboard` o a `?returnUrl=` interno; un `returnUrl` externo, `//host`, con `\` o sin `/` inicial se ignora (`safeReturnUrl`) |
| AC2 credenciales inválidas → "Usuario o contraseña incorrectos" sin indicar cuál | PASS | Con 401 el aviso (`role="alert"`) dice exactamente eso, limpia la contraseña y vuelve a enfocarla; 429 y 5xx/red/otros errores tienen mensajes propios; el aviso desaparece al reenviar |
| AC3 no se puede enviar vacío | PASS | Formulario vacío, usuario sin contraseña y usuario de solo espacios: no se llama al servicio; se muestran los errores con `aria-invalid`/`aria-describedby` y el foco va al primer campo inválido |
| AC4 se ve bien en claro, oscuro y a 375 px | **NO VERIFICADO visualmente** | La extensión de Chrome no estaba conectada, así que no pude abrir la página ni tomar capturas. Verificado solo por construcción: usa los tokens del tema (`bg-background`, `bg-card`, `border-border`, `text-muted-foreground`…) que cambian con `.dark`, incluye `ThemeToggle`, y el contenedor es `w-full max-w-sm` con gutter `px-4` y `p-6` en móvil. `ng serve` sirvió `/login` con 200 y `build:ssr` en `production` compila sin errores ni avisos |

Accesibilidad: etiquetas asociadas, `autocomplete` `username`/`current-password`, botón de mostrar contraseña con `aria-label` y `aria-pressed`, alerta anunciada, todo operable con teclado. Frontend: 287 pruebas, líneas 99.6 %. Notas: hasta F2-06 el interceptor de errores sigue mostrando también un toast "No autorizado" ante el 401 del login; hasta F2-05 `/login` no redirige si ya hay sesión y `/dashboard` sigue sin protección. Requiere a una persona revisar el AC4 en el navegador.
