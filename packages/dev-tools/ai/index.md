# Blockera global-packages — AI knowledge

Platform-independent notes for agents working on shared Blockera packages. Cursor-specific rules and commands live in [`../cursor/`](../cursor/).

## Architecture

- [overview.md](architecture/overview.md)
- [source-of-truth.md](architecture/source-of-truth.md)
- [dependency-rules.md](architecture/dependency-rules.md)
- [package-types.md](architecture/package-types.md)
- [repository-boundaries.md](architecture/repository-boundaries.md)

## Domains

- [editor-style-pipeline.md](domains/editor-style-pipeline.md) — JS extensions, PHP StyleDefinitions, Gutenberg compatibility, Pro overlays, tests

## Decisions

- [001-gp-write-root.md](decisions/001-gp-write-root.md) — standalone origin vs product submodule; when to bump

## Workflows

- [changelog-and-readme.md](workflows/changelog-and-readme.md) — Unreleased inbox + README after a task
- [product-scripts-and-deps.md](workflows/product-scripts-and-deps.md) — installed deps; product npm/Composer scripts only
- [php-performance.md](workflows/php-performance.md) — detailed PHP hot-path patterns (on demand)
- [change-classification.md](workflows/change-classification.md) — LOCAL / CROSS-MODULE / CROSS-REPOSITORY / ARCHITECTURAL

## Packages

Use each package’s `README.md`. Do not duplicate those APIs here.

## Consumers

When this tree is checked out as `packages/global-packages/` inside a product, prefix paths with that folder. Product-specific architecture belongs in that product’s `AGENTS.md` / `.ai/`, not here.
