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
- [inner-blocks-and-block-states.md](domains/inner-blocks-and-block-states.md) — block-card inner blocks / states, attributes, Pro `native` unlock
- [free-vs-pro.md](domains/free-vs-pro.md) — free `applyFilters` for Pro `addFilter`; license gate; overlays; controls-pro / blocks-pro / canvas

## Decisions

- [001-gp-write-root.md](decisions/001-gp-write-root.md) — standalone origin vs product submodule; when to bump
- [002-changelog-fold.md](decisions/002-changelog-fold.md) — Unreleased inbox vs CI fold vs zip accumulation

## Workflows

- [changelog-and-readme.md](workflows/changelog-and-readme.md) — Unreleased by audience; skip Pro unlock / license-gate how-to
- [product-scripts-and-deps.md](workflows/product-scripts-and-deps.md) — installed deps; product npm/Composer scripts only
- [php-performance.md](workflows/php-performance.md) — detailed PHP hot-path patterns (on demand)
- [change-classification.md](workflows/change-classification.md) — LOCAL / CROSS-MODULE / CROSS-REPOSITORY / ARCHITECTURAL
- [dev-tools-paths.md](workflows/dev-tools-paths.md) — origin vs consumer prefix; no hardcoded shared paths
- [refactor-github-ci](../cursor/shared/commands/refactor-github-ci.md) — add or change GitHub workflows and shared CI
- [commit](../cursor/shared/commands/commit.md) — local commits in one repo (no push)
- [commit-and-sync](../cursor/shared/commands/commit-and-sync.md) — commit.md plus push; GP then consumer `submodule:bump` + push

## Packages

Use each package’s `README.md`. Do not duplicate those APIs here.

## Consumers

When this tree is checked out as `packages/global-packages/` inside a product, prefix paths with that folder. Product-specific architecture belongs in that product’s `AGENTS.md` / `.ai/`, not here.
