# Changelog and README after a task

Source of truth for release notes is each **package** `CHANGELOG.md` (see `packages/dev-tools/github/README.md`). Authors append `## Unreleased`. CI folds Unreleased (GP master merge, submodule bump) and product zip accumulates notes.

## When

After every dedicated implementation task, **before** commit.

1. List packages whose **source** changed (`packages/<name>/` here, or consumer host `packages/<name>/`).
2. Update each of those packages that has (or should have) a changelog.
3. Update README only if the public contract changed.
4. Then commit (`commit` Cursor command).

## CHANGELOG.md — do

- Edit `packages/<name>/CHANGELOG.md`.
- Append under `## Unreleased`. If the file is empty or has no Unreleased heading, add `## Unreleased` at the top. Do **not** add `## [x.y.z] - date`.
- One user-facing bullet per notable change.
- Use an existing `###` heading **in that file**. Majority: `New Features`, `Improvements`, `Bug Fixes`, `Automated Tests`. `dev-tools` Unreleased may use `Features` — match the file.
- Map: `feat` → New Features or Features; `fix` → Bug Fixes; user-visible refactor → Improvements; `perf` → Performance Improvements if present, else Improvements. `test:` commits often skip the changelog.

Skip Unreleased for pure `chore` / `style` / `ci` / formatting-only `docs`, and for generated files.

## CHANGELOG.md — do not

- Run `npm run update:changelogs` or `update:master-package-changelogs`.
- Edit product-root `CHANGELOG.md` / `changelog.txt` in feature work.
- Bump `package.json` / `composer.json` versions to “support” the note.
- Copy the same bullet into every consumer (they pick it up via pin + zip).

## README.md — do only if the public contract changed

- Package README: public API, usage, anti-patterns, JS/PHP contracts, consumers, tests.
- Root documented-packages table: only if a package was added or its one-line summary is wrong.

Do not restate the changelog bullet or rewrite a README for an API-unchanged bugfix.
