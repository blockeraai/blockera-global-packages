## Unreleased

### Development Notes
- Agent GitHub CI: follow Cursor command `refactor-github-ci` when adding or
  changing workflows; glob rule `github-ci`. Shared `packages/dev-tools` must
  not hardcode the consumer path (`dev-tools-paths` workflow +
  `resolve-dev-tools-root.sh`).
- Changelog helpers: pick the Unreleased `###` heading by **audience**, not
  commit type. Internals (agent knowledge, Cursor rules, CI helpers) go under
  `Development Notes`, never `Features`.
- Cursor command `commit-and-sync`: same rules as `commit`, then push; after
  GP is on origin, `submodule:bump` all consumers and push them too.
  Commit sparse-checkout GP via `packages/global-packages`; pull `--ff-only`
  (no merge commits) before any commit in each repo.
- Commit commands: **micro commits are required** — group this-chat files by
  changeset and commit each group separately (`commit` and `commit-and-sync`).

## [2.3.0] - 2026-09-01

### Features
- Agent knowledge: inner-blocks / block-states domain card; free-vs-Pro card covers controls-pro, blocks-pro, canvas/global-styles, and license packages; style-pipeline tests run from the Cursor active product.

### Development Notes
- Agent changelog workflow: split end-user notes from internals;
  internals go under `Development Notes` (Automated Tests stays a sibling).
  Zip section order includes both headings.
  - Wrap long bullets onto the next line; nest sub-bullets when one item
    has several parts.
  - Insert `## Unreleased` above the latest version heading; never replace
    `## [x.y.z]` with Unreleased.

## [2.2.0] - 2026-09-01

### Features
- Agent knowledge: `packages/dev-tools/ai/` architecture and workflows (changelog/README after a task; product scripts and pre-installed deps). Cursor `global-architecture` rule plus `commit` / `test-e2e-cypress` command updates.
- PHP performance: keep the Cursor PHP glob rule short; detailed patterns live in `packages/dev-tools/ai/workflows/php-performance.md`.
- Agent knowledge: editor style-pipeline domain card, GP write-root ADR, change-classification workflow; Cursor `classify-change` command. Gutenberg `development-helper` rule is glob-gated (not always-on).
- Agent knowledge: free-vs-Pro overlay domain card; changelog Unreleased-vs-fold ADR (CI README remains the mechanics source).

## [2.1.0] - 2026-08-31

### Features
- Upload to Blockera AI: publish RC and stable GitHub releases; send `files_mode` (`append` for RC, `replace` for stable) so Downloadable files can keep prior RC rows.

### Bug Fixes
- Release: fork source is GitHub's live "Use workflow from" branch (`master` or `release/*`); removed the hardcoded `source_branch` choice list and `sync-release-source-branch-options.yml`.
- Release: optional `source_branch` dispatch input forks from a previous `release/*` for patch hotfixes (excludes later master PRs); hotfix stables skip cherry-pick onto master. `master` still forks from origin/master HEAD.
- Release notes: never call `other:changelog` or GitHub milestones; the draft body is the accumulated product changelog (stable may append `changelog.txt`). Removed the `release-plugin-changelog` / `changelog` CLI command, `other:changelog` npm script, and GitHub milestone lookup helpers.
- Release branches: rc and stable from master fork `release/*` from origin/master HEAD (not from an existing release or RC tip); push uses `--force-with-lease`.
- Zip version bump: set the WordPress `Version:` header in `BLOCKERA_BUILD_ZIP_MAIN_FILE` (theme `style.css` or plugin bootstrap) to `NEW_VERSION` even when it did not match `OLD_VERSION`.
- Zip changelog accumulation: ignore a prerelease `OLD_VERSION` / previous tag so RC and stable both accumulate from the last stable product tag.
- Release notes: quote `--milestone="Name 2.0"` so Commander does not look up a title that is only the product name; complete a truncated title from the release version; fail the job instead of writing the stack into the GitHub release body.
- Sync global-packages submodule: skip auto-push on matching feature branches so `npm run submodule:bump` is not followed by a duplicate blockerabot commit. Master still opens/updates the bump PR; use workflow_dispatch `mode=push` or `mode=pr` for a remote feature-branch pin.
- Zip changelog accumulation: allow products with no consumer `packages/*/CHANGELOG.md` (global-packages only); fail only when `BLOCKERA_CHANGELOG_CONSUMER_GLOBS` is set and matches nothing.
- Zip changelog accumulation: include GP notes only for packages whose `package.json` / `composer.json` version changed since the previous product release pin, from that previous version through the new version (do not dump unchanged package history).
- Zip changelog accumulation: GP-only products (no `packages/*/CHANGELOG.md`) read previous package versions from inlined `packages/<name>` when the last release has no GP gitlink, and keep leftover `## Unreleased` bullets instead of failing.

## [2.0.0] - 2026-08-26

- GitHub workflows: rename `build-plugin-zip.yml` to `release-plugin.yml` (title: Release Blockera Plugin) and `build-plugin-zip-tests.yml` to `release-plugin-tests.yml`.
- Master changelog workflow: run on merge to master (major by default), fold `## Unreleased` into a dated version heading and drop the inbox, bump only packages that changed since the previous merge, and synthesize notes when CHANGELOG.md was not edited.
- Bootstrap: add `--watch` so `npm start` re-runs sync-config when `root-configs/` or `cursor/` templates change; headings show `#N` and a pulsing `● watching` marker; elapsed time sits on the Build heading only. The last line is only `Ctrl+C to stop`.
- Root configs: move `.editorconfig` into `root-configs/` (drop the package-root copy) and remove the leftover package-root `browserslistrc`.
- PR config jobs: detect all leftover PR-only files (`.pr-workflows.json`, `.pr-cypress.env.json`, `.pr-playwright.env.json`, `.pr-env.json`, `.pr-sync-env.json`, `.pr-github-playground.json`, plus `.pr-*`), still skipping example templates.
- Bootstrap: print one count line per step (`Prepare workspace` / `Configure project files`); item names stay in `.cache/watch-bootstrap.log`.
- Root configs: sync `.editorconfig`, `.env.example`, `.eslintrc.js`, `.gitignore`, `cypress.config.js`, and `cypress.env-example.json` (shared templates plus per-product overlays). `.gitignore` prepends product extras when `.gitignore.<project>` exists. Bootstrap clean-up also removes Cypress/Playwright reports, coverage, snapshot diffs, and test caches.
- Root configs: sync Playwright (`playwright.config.js`, `playwright.env.example.json`, `.pr-playwright.env-example.json`) and Cypress (`.pr-cypress.env-example.json`) examples; `.pr-env.example.json` writes only for `blockera-one`.
- PR workflows: add `.pr-workflows.example.json` and gate pull_request CI via `.pr-workflows.json` → `allowedActions`.
- PR workflow gate: keep action in dev-tools submodule; gate jobs require BLOCKERA_GLOBAL_PACKAGES_TOKEN.
- setup-php: strip wp-cli with composer remove --no-update and fix jq lock pruning.
- Bundle size: truncate oversized PR comments to GitHub's 65536-character limit instead of dropping files from the report.

## 1.0.0 (2024-12-08)
