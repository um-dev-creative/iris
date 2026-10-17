# CI/CD

## Pipeline (`.github/workflows/ci.yml`)

Se ejecuta en cada `pull_request` y en `push` a `main`; un push nuevo cancela la ejecución anterior del mismo ref. Dos jobs. `ci` (`Build, tests y cobertura`, límite 10 min) es el requerido y tiene estas etapas; `build-entornos` (`Build por entorno`) compila el SSR con cada `ENVM` válido en paralelo (ver [entornos](environments.md)).

| # | Etapa | Comando | Falla si… |
|---|---|---|---|
| 1 | Instalar | `pnpm install --frozen-lockfile` (caché del store de pnpm) | el lockfile no coincide con `package.json` |
| 2 | Build | `ENVM=production pnpm build:ssr` (cliente + servidor SSR) | no compila |
| 3 | Frontend | `pnpm test` | una prueba falla o una métrica de `src/app` < 85 % |
| 4 | BFF | `pnpm test:server` | una prueba falla o una métrica de `server/` < 85 % |
| 5 | Resumen | `node scripts/coverage-summary.mjs` → job summary | — (siempre se ejecuta) |
| 6 | Artefacto | carpeta `coverage/` (lcov + HTML) | — |
| 7 | Secretos | `gitleaks detect --config .gitleaks.toml` sobre todo el historial | hay hallazgos |

Las etapas 3 y 4 emiten una anotación `::error::` con el motivo; el detalle (qué métrica y cuánto) sale en el log de Vitest.

## Tiempos

Ejecución local equivalente sobre una copia limpia (instalación con lockfile, build SSR, ambas suites): **≈ 30 s**. En GitHub Actions se espera por debajo de 3 min; el límite del job es 10 min.

## Reproducir en local

```bash
pnpm install --frozen-lockfile
ENVM=production pnpm build:ssr
pnpm test && pnpm test:server
node scripts/coverage-summary.mjs
gitleaks detect --config .gitleaks.toml --redact
```

## Protección de `main`

Marcar el check `Build, tests y cobertura` como requerido en la configuración de la rama es un paso manual del repositorio (y de F4-04, que añade el control de cobertura del diff).

## Acciones fijadas por SHA

Las acciones de `ci.yml` se referencian por SHA de commit completo, con el tag como comentario (`# v4.4.0`), como pide SonarCloud (S7637) y para que un tag movido no cambie el pipeline. Para actualizar una: resolver el SHA del tag nuevo (`gh api repos/<dueño>/<repo>/git/ref/tags/<tag>`) y cambiar ambos, SHA y comentario.
