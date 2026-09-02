# ADR 002 — Changelog Unreleased vs fold

## Status

Accepted.

## Context

Agents confuse three changelog surfaces: package `## Unreleased` (author inbox), automated **fold** on GP master merge / submodule bump, and product-root notes written by the **zip** job. Running fold scripts or editing root `CHANGELOG.md` in a feature PR breaks release accumulation.

## Decision

1. **Authors** only append `## Unreleased` on the package `CHANGELOG.md` whose source changed. Pick `###` by audience: end-user headings already in the file; tests → `Automated Tests`; internals → `Development Notes` (never Features). Insert Unreleased at the top if missing; never rename a version heading into Unreleased. Never add `## [x.y.z] - date` in feature work.
2. **Do not** run `npm run update:changelogs`, `update:master-package-changelogs`, or equivalent fold/zip changelog scripts unless the user is running a release and asked.
3. **Do not** edit product-root `CHANGELOG.md` / `changelog.txt` in feature PRs. Zip accumulates those.
4. **GP:** merge to GP `master` folds Unreleased (dated/semver job). **Consumer pin:** bump may fold remaining GP Unreleased on a branch tip (`chore(changelog): fold Unreleased`). **Product zip:** diffs GP package versions in the pin window and folds **consumer** Unreleased into the product version heading.
5. Skip Unreleased for pure `chore` / `style` / `ci` / formatting-only `docs`, generated files, and **Pro unlock / license-gate how-to** (any heading). Details: [../workflows/changelog-and-readme.md](../workflows/changelog-and-readme.md).

## Source of truth

Mechanics, env flags (`BLOCKERA_CHANGELOG_FOLD_ON_BUMP`, `BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP`), and zip globs: `packages/dev-tools/github/README.md` (changelog section). Author checklist: [../workflows/changelog-and-readme.md](../workflows/changelog-and-readme.md).

Do not duplicate the CI README here. If fold behavior changes, update that README first, then this ADR’s decision list if still accurate.
