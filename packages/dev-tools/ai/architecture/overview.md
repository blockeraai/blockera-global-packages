# Overview

`blockera-global-packages` is the canonical monorepo of shared Blockera code under `packages/`. Root npm name: `@blockera/global-packages` (private). Packages are linked with `file:packages/...` and Composer path repositories — **not** npm workspaces.

Consumers are WordPress products that pin this repository as a sparse submodule at `packages/global-packages`:

| Product | Role |
|---------|------|
| `blockera` | Free plugin — thin host; runtime mostly from `@blockera/blockera` |
| `blockera-pro` | Pro plugin — GP plus host packages (`editor-pro`, `blocks-pro`, …) |
| `blockera-one` | FSE theme — GP plus `blockera-one` / `blockera-admin-one` |
| `blockera-site-toolkit` | blockera.ai licensing/downloads — GP plus `site-toolkit` |

Editor JS research uses Gutenberg clones at the **product** `source-codes/block-editor/`. Server PHP uses `source-codes/wordpress/src/`. Those trees are not in this repo.

Package count (approx.): 29 top-level dirs under `packages/` plus nested `features-library/icon`.
