## Unreleased

### Bug Fixes
- Release branches: every rc and stable run forks `release/*` from origin/master HEAD (not from an existing release or RC tip); push uses `--force-with-lease`.
- Zip version bump: set the WordPress `Version:` header in `BLOCKERA_BUILD_ZIP_MAIN_FILE` (theme `style.css` or plugin bootstrap) to `NEW_VERSION` even when it did not match `OLD_VERSION`.
- Zip changelog accumulation: ignore a prerelease `OLD_VERSION` / previous tag so RC and stable both accumulate from the last stable product tag.
- Release notes: pass `GITHUB_TOKEN` / `BLOCKERA_GLOBAL_PACKAGES_TOKEN` into `other:changelog` so private-repo milestone listing is authenticated (GitHub returns HTTP 404 when unauthenticated).
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
