# Repository boundaries

## This repo (GLOBAL_SHARED)

Write shared packages, Cursor templates, GitHub shared CI under `packages/dev-tools/github/`, and this `packages/dev-tools/ai/` tree.

Consumers sparse-checkout **only** `/packages/`. Root `AGENTS.md` is visible when this standalone checkout is open; inside a product, use `packages/global-packages/packages/dev-tools/ai/` and the product `AGENTS.md`.

## Consumers

| Repo | Write |
|------|--------|
| blockera | Plugin header, `config/`, host tests/snapshots, product `AGENTS.md` / `.ai/` |
| blockera-pro | Pro host packages, unlocks, product AI docs |
| blockera-one | Theme packages, templates-builder, stamps |
| blockera-site-toolkit | `packages/site-toolkit` (licenses, OAuth, downloads) |

Do not copy this architecture folder into every consumer. Point at `packages/global-packages/packages/dev-tools/ai/`.

## Product-scope (Cursor)

Default active product is `blockera` unless the user named another. GP writes in a consumer session go to **that product’s** `packages/global-packages/` submodule, not another product’s checkout. Ask before editing a second product.

This ecosystem-architecture initiative used the **standalone** `blockera-global-packages` origin. Later submodule pins pick it up; do not bump consumer gitlinks unless asked.

## Out of bounds

Installed WordPress, third-party plugins, and `source-codes/` (read-only reference) unless the task is research.
