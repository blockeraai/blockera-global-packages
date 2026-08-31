# ADR 001 — Global-packages write root

## Status

Accepted.

## Context

`blockera-global-packages` is the canonical remote. Each product pins it as a sparse submodule at `packages/global-packages` (`/packages/` only). Cursor often opens **five** working trees (standalone GP + four products). Agents can edit the same logical file in more than one checkout.

## Decision

1. **Named standalone GP / files only in that repo** — write `blockera-global-packages` (this origin). Do not also patch every consumer submodule copy of the same file.
2. **Active product session** (`product-scope.mdc`) — write GP only at `<active-product>/packages/global-packages/`. Do not write another product’s submodule. Do not write standalone GP unless the user set that as the write target.
3. **Do not dual-write.** One checkout per change. Other trees pick it up via pin.
4. **Pins** — after the origin SHA is on `origin`, consumers update with `npm run submodule:bump` (or CI `sync-global-packages-submodule`) when the user asks or when they need that SHA locally. Do not bump all products as a side effect of a docs edit unless asked.
5. **Generated Cursor files** — edit `packages/dev-tools/cursor/` here; consumers run `npm run project:bootstrap`. Do not hand-edit host `.cursor/`.

## Consequences

- Sparse-checkout hides origin-root `AGENTS.md` inside products; use `packages/global-packages/packages/dev-tools/ai/` there.
- A product submodule can lag origin until bump (same as application code).
- Dirty edits in four submodule copies of one file are incorrect; fix origin (or the single active submodule), then bump.

## See also

[../architecture/source-of-truth.md](../architecture/source-of-truth.md), [../architecture/repository-boundaries.md](../architecture/repository-boundaries.md), Cursor `product-scope.mdc`.
