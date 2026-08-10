# Shared GitHub Actions for Blockera consumers

Canonical CI building blocks for repos that consume this monorepo as a sparse submodule at `packages/global-packages`.

## Layout

```
github/
  actions/          # composite actions (callable after submodule init)
  workflows/        # template workflow YAML for consumers to copy/adapt
  config/schema.json
```

## Consumer contract

Each consumer keeps:

1. `.github/blockera-ci.json` — plugin-specific settings (see `config/schema.json`)
2. Thin `.github/workflows/*.yml` — triggers, permissions, concurrency only
3. Local `.github/scripts/ensure-global-packages-sparse.sh` — required before composites under this tree can run

Flow:

```
checkout → ensure sparse submodule → uses: ./packages/global-packages/packages/dev-tools/github/actions/<name>
```

GitHub cannot `uses:` reusable workflows from a package path. Prefer **composite actions** here; keep workflow triggers in the consumer.

## This package currently provides

- `actions/code-lint` — run js / css / php lint suites from consumer config
- `workflows/sync-global-packages-submodule.yml` — template for submodule auto-bump
- `workflows/code-lint.yml` — example thin consumer workflow
