# Shared GitHub Actions for Blockera consumers

Canonical CI building blocks for repos that consume this monorepo as a sparse
submodule at `packages/global-packages`
(`blockera`, `blockera-pro`, `blockera-one`, …).

## Why this package exists

Duplicate workflow YAML across consumers drifts quickly. Shared logic lives here;
each consumer only keeps:

1. **Config** — `.github/blockera-ci.json` identity + overrides only
   (merged over `config/defaults.json`; see `config/schema.json`)
2. **Thin workflow callers** — triggers, concurrency, `repository` guard, and a
   `uses:` of a reusable workflow in this repo
3. **Bootstrap scripts** — local copy of `ensure-global-packages-sparse.sh` (and
   husky helpers) so the submodule can be initialized on the runner

## Hard GitHub constraint

GitHub **cannot** discover or `uses:` workflows from a path inside a submodule
checkout (`packages/global-packages/.../workflows/*.yml` are **templates only**).

Reusable workflows **can** live in this repository’s real
`.github/workflows/consumer-*.yml` and be called as:

```yaml
uses: blockeraai/blockera-global-packages/.github/workflows/consumer-jest-unit-tests.yml@<ref>
```

| Put in blockera-global-packages | Keep in each consumer |
| --- | --- |
| Reusable workflows (`.github/workflows/consumer-*.yml`) | Thin `.github/workflows/*.yml` callers |
| Composite actions (`packages/dev-tools/github/actions/*`) | `.github/blockera-ci.json` overrides |
| Shared scripts + `config/defaults.json` | Bootstrap copy of ensure/husky scripts |
| Thin-caller templates (`packages/dev-tools/github/workflows/*`) | — |

## Layout

```
# Repo root (callable by GitHub)
.github/workflows/
  consumer-jest-unit-tests.yml
  consumer-code-lint.yml
  …

# Package (composites, defaults, templates)
packages/dev-tools/github/
  actions/
    setup-node/
    setup-php/
    code-lint/
    jest-unit-tests/
  scripts/
    load-ci-config.js
    ensure-global-packages-sparse.sh
    …
    sync-consumer-bootstrap.sh
  workflows/              # thin-caller templates (copy into consumers)
  config/
    defaults.json
    schema.json
```

## Consumer contract

### Thin caller (preferred)

```yaml
# consumer .github/workflows/jest-unit-tests.yml
name: JavaScript Unit Tests (By Jest)
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  workflow_dispatch:
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.head_ref || github.sha }}
  cancel-in-progress: true
jobs:
  unit-js:
    if: ${{ github.repository == 'blockeraai/blockera-pro' || github.event_name == 'pull_request' }}
    uses: blockeraai/blockera-global-packages/.github/workflows/consumer-jest-unit-tests.yml@<ref>
    secrets:
      BLOCKERABOT_PAT: ${{ secrets.BLOCKERABOT_PAT }}
    with:
      config-path: .github/blockera-ci.json
```

`<ref>` should be a **SHA or tag** that contains the reusable workflow (and matching
composites). After changing CI definitions in GP, bump that ref in every consumer
caller (same change-set as the submodule pin when possible).

Reusable workflows checkout the **caller**, run the consumer bootstrap script, then
use composites via `./packages/dev-tools/github/actions/*` from the GP ref.

### Bootstrap scripts

Sync from the submodule (source of truth):

```bash
bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh
```

Local `.github/setup-node` / `.github/setup-php` remain for workflows not yet moved
to reusable callers.

### Config (defaults + consumer merge)

```
deepMerge(config/defaults.json, consumer .github/blockera-ci.json)
```

Consumers only declare identity and **overrides**:

```json
{ "pluginSlug": "blockera-pro", "repository": "blockeraai/blockera-pro" }
```

```json
{
  "pluginSlug": "blockera",
  "repository": "blockeraai/blockera",
  "test": { "jest": { "composerInstall": true } }
}
```

```bash
node packages/global-packages/packages/dev-tools/github/scripts/load-ci-config.js .github/blockera-ci.json
```

## Migration roadmap

| Phase | Shared piece | Status |
| --- | --- | --- |
| 1 | Composites + defaults + submodule scripts | done |
| 1b | Reusable workflows: `consumer-jest-unit-tests`, `consumer-code-lint` | **this** |
| 2 | `bundle-size`, `virus-total`, `php-unit-tests` reusable workflows | next |
| 3 | Cypress / Playwright e2e | next |
| 4 | Zip build / plugin-check / theme-check (`productType`) | next |
| — | Product-only jobs | stay local or optional |

When adding a new shared job:

1. Add defaults in `config/defaults.json` when shared
2. Add `packages/dev-tools/github/actions/<name>/`
3. Add `.github/workflows/consumer-<name>.yml` (`workflow_call`)
4. Add thin-caller template under `packages/dev-tools/github/workflows/`
5. Point each consumer thin workflow at the reusable workflow `@<ref>`
6. Keep only overrides in consumer `blockera-ci.json`

## This package currently provides

- Reusable: `.github/workflows/consumer-jest-unit-tests.yml`, `consumer-code-lint.yml`
- `config/defaults.json` + `scripts/load-ci-config.js`
- `actions/setup-node`, `setup-php`, `code-lint`, `jest-unit-tests`
- Submodule + npm helper scripts
- Thin-caller templates under `packages/dev-tools/github/workflows/`
