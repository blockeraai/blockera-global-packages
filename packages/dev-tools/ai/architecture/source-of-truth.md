# Source of truth

## Shared packages

Canonical: this repository’s `packages/<name>/`.

Consumers receive the same tree via git submodule `packages/global-packages` (sparse-checkout `/packages/` only). Update the pin with the product script `npm run submodule:bump` or CI `sync-global-packages-submodule`. Which checkout to **write** is [ADR 001](../decisions/001-gp-write-root.md).

Host `.cursor/` on consumers is **generated** by `npm run project:bootstrap` from `packages/dev-tools/cursor/` (`shared/` then `cursor/<project>/` overlay). Edit templates here, not the gitignored host copy.

Host root configs (ESLint, Cypress examples, `.gitignore` shared section, …) come from `packages/dev-tools/root-configs/`.

## What is not canonical here

| Concept | Canonical location |
|---------|-------------------|
| Gutenberg internals | Product `source-codes/block-editor/` |
| WordPress PHP / REST / theme.json | Product `source-codes/wordpress/src/` |
| Product plugin/theme bootstrap | Consumer repo (`blockera.php`, theme `style.css`, host `packages/`) |
| Product Unreleased (host packages) | Consumer `packages/<host-pkg>/CHANGELOG.md` |
| Product release notes | CI zip job → product root `CHANGELOG.md` / `changelog.txt` |

## Changelog fold (do not run in feature PRs)

Package `CHANGELOG.md` `## Unreleased` is the inbox. GP master merge and submodule bump **fold** Unreleased; product zip **accumulates** notes. See `packages/dev-tools/github/README.md` and [../workflows/changelog-and-readme.md](../workflows/changelog-and-readme.md).
