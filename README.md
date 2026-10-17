# Iris

[![CI](https://github.com/um-dev-creative/iris/actions/workflows/ci.yml/badge.svg)](https://github.com/um-dev-creative/iris/actions/workflows/ci.yml)

Dashboard de monitoreo construido con **Angular 22**, **Tailwind CSS 4** y **Lucide Icons**.

## Inicio rápido

```bash
git clone https://github.com/um-dev-creative/iris.git
cd iris
pnpm install
pnpm start        # http://localhost:4200
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start` | `ng serve` en :4200 (solo frontend) |
| `pnpm build:dev` | Build de desarrollo |
| `pnpm build` / `pnpm build:ssr` | Build con `ENVM` (SSR en el segundo) |
| `pnpm serve:integrated` | Build SSR y `node server.js` (BFF + app) |
| `pnpm dev:integrated:unix` | Watch del build y BFF |
| `pnpm server` | Solo el BFF (`node server.js`) |
| `pnpm test` / `pnpm test:server` / `pnpm test:all` | Vitest frontend / BFF / ambos, con gate de cobertura 85 % ([política](docs/roadmap/COVERAGE_POLICY.md), [guía](docs/technical/testing.md)) |

## Stack

Angular 22 · Tailwind CSS 4 · TypeScript 6.0 · RxJS 7.8 · Lucide Icons

## Licencia

[Apache 2.0](LICENSE)
