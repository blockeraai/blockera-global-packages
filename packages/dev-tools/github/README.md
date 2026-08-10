# Shared GitHub Actions for Blockera consumers

Canonical CI building blocks for repos that consume this monorepo as a sparse
submodule at `packages/global-packages`
(`blockera`, `blockera-pro`, `blockera-one`, …).

## Why this package exists

Duplicate workflow YAML across consumers drifts quickly. Shared logic lives here;
each consumer only keeps:

1. **Config** — `.github/blockera-ci.json` (see `config/schema.json`)
2. **Thin workflows** — triggers, permissions, concurrency, `repository` guard
3. **Bootstrap** — a tiny local ensure step so this tree exists on disk before
   any `uses: ./packages/global-packages/...` composite runs

## Hard GitHub constraint

GitHub **cannot** `uses:` [reusable workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
from a path inside another repository checkout/submodule.

Therefore:

| Put in this package | Keep in each consumer |
| --- | --- |
| Composite actions (`actions/*`) | `.github/workflows/*.yml` triggers |
| Shared scripts (`scripts/*`) | Bootstrap copy of ensure/husky scripts |
| Workflow **templates** (`workflows/*`) | Adapted thin YAML (copy from templates) |
| Config schema | `.github/blockera-ci.json` values |

## Layout

```
github/
  actions/
    setup-node/           # npm install (after bootstrap)
    setup-php/            # composer install (after bootstrap)
    code-lint/            # js | css | php from config
    jest-unit-tests/      # optional build + jest from config
  scripts/
    ensure-global-packages-sparse.sh
    bump-global-packages-submodule.sh
    ensure-global-packages-pre-push.sh
    ensure-global-packages-mirror-branch.sh
    retry-npm-ci.sh
    sync-consumer-bootstrap.sh   # copy bootstrap scripts → consumer .github/scripts
  workflows/              # templates to copy into consumers
  config/schema.json
```

## Consumer contract

### Bootstrap (required)

`uses: ./packages/global-packages/packages/dev-tools/github/actions/<name>` only
works **after** the submodule is initialized. Consumers keep a local thin
wrapper:

```yaml
# .github/setup-node/action.yml (consumer)
steps:
  - name: Ensure global-packages submodule (sparse)
    shell: bash
    env:
      BLOCKERA_GLOBAL_PACKAGES_TOKEN: ${{ inputs.global-packages-token }}
    run: bash "${GITHUB_WORKSPACE}/.github/scripts/ensure-global-packages-sparse.sh" "${GITHUB_WORKSPACE}"

  - name: Setup Node (shared)
    uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-node
    with:
      node-version: ${{ inputs.node-version }}
```

Same pattern for `.github/setup-php`.

Sync bootstrap scripts from the submodule (source of truth):

```bash
bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh
```

### Config

```json
{
  "pluginSlug": "blockera-pro",
  "repository": "blockeraai/blockera-pro",
  "productType": "plugin",
  "lint": {
    "js": { "command": "npm run lint:js" },
    "css": { "command": "npm run lint:css", "scssRoot": "./packages", "scssGlob": "*.scss" },
    "php": {
      "command": "phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml",
      "reportPath": "./.cache/phpcs-report.xml"
    }
  },
  "test": {
    "jest": {
      "command": "npm run test:js -- --ci --maxWorkers=2 --cacheDirectory=\"$HOME/.jest-cache\"",
      "build": true,
      "composerInstall": false
    }
  },
  "workflows": {
    "codeLint": true,
    "jest": true
  }
}
```

### Thin workflow flow

```
checkout
  → uses: ./.github/setup-node|setup-php   # local bootstrap + shared setup
  → uses: ./packages/global-packages/packages/dev-tools/github/actions/<job>
      with: { config-path: .github/blockera-ci.json }
```

## Migration roadmap

Move job bodies into composites here; leave triggers in consumers.

| Phase | Shared composite / scripts | Status |
| --- | --- | --- |
| 1 | `setup-node`, `setup-php`, `code-lint`, `jest-unit-tests`, submodule scripts | **this tree** |
| 2 | `bundle-size`, `virus-total`, `php-unit-tests` | next |
| 3 | Cypress / Playwright e2e (config-driven matrix) | next |
| 4 | Zip build / plugin-check / theme-check (gated by `productType`) | next |
| — | Product-only jobs (perf benchmark, theme patterns, …) | stay local or optional composites |

When adding a new shared job:

1. Add `actions/<name>/action.yml` reading `.github/blockera-ci.json`
2. Extend `config/schema.json`
3. Add `workflows/<name>.yml` template with `OWNER/REPO` placeholder
4. Point each consumer thin workflow at the composite
5. Delete duplicated steps from consumers

## This package currently provides

- `actions/setup-node` / `actions/setup-php`
- `actions/code-lint`
- `actions/jest-unit-tests`
- Submodule + npm helper scripts under `scripts/`
- Templates: `workflows/code-lint.yml`, `workflows/jest-unit-tests.yml`, `workflows/sync-global-packages-submodule.yml`
