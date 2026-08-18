## Unreleased

- Root configs: sync Playwright (`playwright.config.js`, `playwright.env.example.json`, `.pr-playwright.env-example.json`) and Cypress (`.pr-cypress.env-example.json`) examples; `.pr-env.example.json` writes only for `blockera-one`.
- PR workflows: add `.pr-workflows.example.json` and gate pull_request CI via `.pr-workflows.json` → `allowedActions`.
- Bundle size: truncate oversized PR comments to GitHub's 65536-character limit instead of dropping files from the report.


## 1.0.0 (2024-12-08)
