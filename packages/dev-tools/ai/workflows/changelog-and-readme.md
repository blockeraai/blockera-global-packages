# Changelog and README after a task

Source of truth for release notes is each **package** `CHANGELOG.md`. Authors append `## Unreleased`. CI folds Unreleased (GP master merge, submodule bump) and product zip accumulates notes. Policy: [../decisions/002-changelog-fold.md](../decisions/002-changelog-fold.md). Mechanics: `packages/dev-tools/github/README.md`.

## When

After every dedicated implementation task, **before** commit.

1. List packages whose **source** changed (`packages/<name>/` here, or consumer host `packages/<name>/`).
2. Update each of those packages that has (or should have) a changelog.
3. Update README only if the public contract changed.
4. Then commit (`commit` Cursor command).

## CHANGELOG.md — do

- Edit `packages/<name>/CHANGELOG.md`.
- Append bullets under `## Unreleased`. If that heading is missing, **insert**
  `## Unreleased` at the top of the file (above the latest `## [x.y.z]`).
  Do **not** rename, replace, or delete a version heading. Leave published
  version sections as they are. Do **not** add `## [x.y.z] - date`.
- One bullet per notable change (a task may add both a user bullet and a Development Notes bullet).
- Wrap a long bullet onto the next line; indent the continuation.
- If one change has several parts, nest indented sub-bullets under that item.

### Audience (pick the heading)

1. **End user** — they see it or are affected.
   - Headings: `New Features`, `Improvements`, `Bug Fixes` (match the file).
   - Plain language. No helper names, file paths, or architecture unless
     the user would recognize them.
2. **Tests only** — `Automated Tests`. Add the heading if Unreleased does
   not have it.
3. **Other internals** — users will not notice (helpers, architecture,
   tooling, agent knowledge).
   - Heading: `Development Notes`. Add this `###` under Unreleased even if
     the file never had it.
   - Do not put these under Features/Improvements.

Reuse other `###` headings that already exist in that file.
`dev-tools` Unreleased may use `New Features` — match the file.

Map: `feat` → New Features or Features; `fix` → Bug Fixes;
user-visible refactor → Improvements; `perf` → Performance Improvements
if present, else Improvements; `test:` → Automated Tests.

Skip Unreleased for pure `chore` / `style` / `ci` / formatting-only `docs`, and for generated files.

## CHANGELOG.md — do not

- Run `npm run update:changelogs` or `update:master-package-changelogs`.
- Turn `## [x.y.z]` (or any dated version heading) into `## Unreleased`.
- Edit product-root `CHANGELOG.md` / `changelog.txt` in feature work.
- Bump `package.json` / `composer.json` versions to “support” the note.
- Copy the same bullet into every consumer (they pick it up via pin + zip).

## README.md — do only if the public contract changed

- Package README: public API, usage, anti-patterns, JS/PHP contracts, consumers, tests.
- Root documented-packages table: only if a package was added or its one-line summary is wrong.

Do not restate the changelog bullet or rewrite a README for an API-unchanged bugfix.
