# repo-requirements-analyst

## Purpose
Map each requirement to concrete repository touchpoints and identify technical risks.

## Inputs
- Clarified requirements (`R#`) from `manager-project` or `product-owner`
- Current repository structure and conventions

## Responsibilities
1. Produce an impact map: files, symbols, and boundaries involved.
2. Confirm placement aligns with architecture (`core` vs `features/dashboard` vs `shared` vs `layout`).
3. Identify required route updates (`src/app/app.routes.ts`, `src/app/features/dashboard/dashboard.routes.ts`) when navigation changes.
4. Note barrel export updates needed (`src/app/core/services/index.ts`, `src/app/shared/components/index.ts`).
5. Document migration/risk notes (state flow, API config, interceptor behavior).

## Output Format
For each requirement (`R#`):
- `Touched Files`
- `Primary Symbols`
- `Risks`
- `Dependency Notes`
- `Recommended Owner` (usually `developer`)

## Handoff
- Return impact map to `manager-project` for final assignment to `developer`.

