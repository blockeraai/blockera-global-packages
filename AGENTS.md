# Agents — blockera-global-packages

Canonical monorepo of shared Blockera packages (`packages/`). Consumers (blockera, blockera-pro, blockera-one, blockera-site-toolkit) pin this repo as a **sparse git submodule** at `packages/global-packages` (`/packages/` only).

## Source of truth

- **Edit shared packages here** (or in the active product’s submodule checkout per product-scope). Do not fork copies in consumers.
- Detailed knowledge: [`packages/dev-tools/ai/index.md`](packages/dev-tools/ai/index.md)
- Cursor templates (generated onto consumers): [`packages/dev-tools/cursor/`](packages/dev-tools/cursor/)
- Package APIs: each `packages/<name>/README.md` (`@blockera/storage` is the quality bar)

## Inspect before changing

1. The target package README and public `main` / Composer autoload
2. Architecture: [`packages/dev-tools/ai/architecture/`](packages/dev-tools/ai/architecture/)
3. Gutenberg / WordPress behavior: consumer `source-codes/` (not this repo)

## Constraints

- Prefer public package APIs. No deep imports of private files. No new abstraction when an existing export works.
- Side-effect entries (`blockera`, `blockera-admin`, `plugin-compatibility`) are boots, not utility libraries.
- Keep JS ↔ PHP contracts in sync where both sides exist.
- After a dedicated task: Unreleased changelog with heading by audience (internals → `Development Notes`). Skip notes that explain Pro unlock / license validation. README only if the public contract changed. [`workflows/changelog-and-readme.md`](packages/dev-tools/ai/workflows/changelog-and-readme.md)
- Do not install deps. Run tests via **product** `package.json` / `composer.json` scripts (`npm run test:e2e`, `test:js`, `test:unit:php`). [`workflows/product-scripts-and-deps.md`](packages/dev-tools/ai/workflows/product-scripts-and-deps.md)
- GitHub workflows (add or change): Cursor command `refactor-github-ci`. Do not hardcode `packages/global-packages/` inside `packages/dev-tools/` ([`dev-tools-paths.md`](packages/dev-tools/ai/workflows/dev-tools-paths.md)).
- Local commit: command `commit`. Commit + push + pin all consumers: command `commit-and-sync`.
- Consumers pick up changes via `submodule:bump` / CI.

## Validate

Use the **active product** scripts when validating consumer behavior. In this repo, use this root’s `package.json` scripts (`test:js`, `test:unit:php`, `test:e2e`).
