## Unreleased

- Bootstrap: print one count line per step (`Prepare workspace` / `Configure project files`); item names stay in `.cache/watch-bootstrap.log`.
- Root configs: sync `.editorconfig`, `.env.example`, `.eslintrc.js`, `.gitignore`, `cypress.config.js`, and `cypress.env-example.json` (shared templates plus per-product overlays). `.gitignore` prepends product extras when `.gitignore.<project>` exists. Bootstrap clean-up also removes Cypress/Playwright reports, coverage, snapshot diffs, and test caches.
- Root configs: sync Playwright (`playwright.config.js`, `playwright.env.example.json`, `.pr-playwright.env-example.json`) and Cypress (`.pr-cypress.env-example.json`) examples; `.pr-env.example.json` writes only for `blockera-one`.
- PR workflows: add `.pr-workflows.example.json` and gate pull_request CI via `.pr-workflows.json` → `allowedActions`.
- PR workflow gate: keep action in dev-tools submodule; gate jobs require BLOCKERA_GLOBAL_PACKAGES_TOKEN.
- Bundle size: truncate oversized PR comments to GitHub's 65536-character limit instead of dropping files from the report.


## 1.0.0 (2024-12-08)
