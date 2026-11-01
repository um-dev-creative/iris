# Iris

[![CI](https://github.com/um-dev-creative/iris/actions/workflows/ci.yml/badge.svg)](https://github.com/um-dev-creative/iris/actions/workflows/ci.yml)

Dashboard de monitoreo construido con **Angular 22**, **Tailwind CSS 4** y **Lucide Icons**, servido por un BFF Node/Express que se conecta a Mercury y Backbone.

## Requisitos

- Node.js `^22.22.3`, `^24.15.0` o `>=26` (ver `engines` en `package.json`)
- pnpm 12 (`corepack enable` instala la versión de `packageManager`)
- `gitleaks` para el hook pre-commit: `brew install gitleaks`

## Inicio rápido

```bash
git clone https://github.com/um-dev-creative/iris.git
cd iris
pnpm install                      # también activa el hook pre-commit (.githooks)
cp secrets/local.env.example secrets/local.env   # opcional: todas las variables tienen valor por defecto local
pnpm dev                          # frontend en http://localhost:4200 y BFF en :4000, con config/local.env y secrets/local.env
```

Para ejecutar el stack completo (app + BFF con proxies a Mercury y Backbone):

```bash
ENVM=development pnpm serve:integrated   # http://localhost:4000
```

Las variables de entorno están documentadas en [`config/local.env`](config/local.env) y [`secrets/local.env.example`](secrets/local.env.example) y su ubicación en cada forma de ejecución, en [entornos](docs/technical/environments.md#dónde-van-las-variables). `NODE_ENV=production` exige `BACKBONE_APPLICATION_ID`, `BACKBONE_CLIENT_ID` y `BACKBONE_CLIENT_SECRET`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start` | `ng serve` en :4200; reenvía `/mrc`, `/bkd` y `/health` al BFF (`IRIS_BFF_URL`, por defecto :4000) |
| `pnpm build:dev` | Build de desarrollo |
| `pnpm build` / `pnpm build:ssr` | Build con `ENVM` (`development`, `dev`, `qa`, `dev-cloud`, `qa-cloud`, `production`; SSR en el segundo). Ver [entornos](docs/technical/environments.md) |
| `pnpm serve:integrated` | Build SSR y `node server.js` (BFF + app) |
| `pnpm dev` | `ng serve` y el BFF juntos, con `config/local.env` y `secrets/local.env` |
| `pnpm start:bff` | Solo el BFF: carga `config/local.env` y `secrets/local.env`, y ejecuta `node server.js` |
| `pnpm test` / `pnpm test:server` / `pnpm test:all` | Vitest frontend / BFF / ambos, con gate de cobertura 85 % |
| `pnpm coverage:merge` | Une los `lcov.info` de ambos proyectos |

## Pruebas y calidad

Cobertura mínima del **85 %** en frontend y backend ([política](docs/roadmap/COVERAGE_POLICY.md), [guía de pruebas](docs/technical/testing.md)). CI ejecuta build SSR, pruebas, cobertura y `gitleaks` en cada PR ([detalle](docs/technical/ci-cd.md)).

## Contribuir

- Ramas por tarea y commits con [Conventional Commits](docs/technical/contributing.md) (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`…).
- Cada PR usa la [plantilla](.github/pull_request_template.md): criterios de aceptación, cobertura ≥ 85 %, entrada en el [CHANGELOG](CHANGELOG.md), documentación y comunicación.
- Nunca se commitean secretos: `.env` y `secrets/*.env` están ignorados y el hook pre-commit ejecuta `gitleaks`.

## Documentación

| Para… | Ver |
|---|---|
| Entender el sistema | [docs técnicas](docs/technical/README.md) (arquitectura, frontend, backend, pruebas, CI) |
| Operar la aplicación | [docs de usuario](docs/user/README.md) |
| Saber qué viene | [roadmap MVP v0.1.0](docs/roadmap/README.md) |
| Saber qué cambió | [CHANGELOG](CHANGELOG.md) |
| Contexto histórico | [docs/history](docs/history/README.md) |

## Stack

Angular 22 · Tailwind CSS 4 · TypeScript 6.0 · RxJS 7.8 · Lucide Icons · Express 4 · Vitest

## Licencia

[Apache 2.0](LICENSE)
