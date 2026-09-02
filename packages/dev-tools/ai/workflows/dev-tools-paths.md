# Shared `packages/dev-tools` paths

Do not hardcode the consumer prefix in files that **live under** `packages/dev-tools/`.

| Checkout | Path to this package |
|----------|----------------------|
| Standalone origin (`blockera-global-packages`) | `packages/dev-tools/` |
| Product submodule | `packages/global-packages/packages/dev-tools/` |

## Shared code (scripts, actions, JS)

Resolve at runtime. Do not default only to `packages/global-packages/packages/dev-tools/`.

Prefer, in order:

1. Path relative to the current file (`dirname`, `BASH_SOURCE`, `GITHUB_ACTION_PATH`, `__dirname`) — same as `setup-php` using `"${GITHUB_ACTION_PATH}/../../scripts/…"`
2. `github/scripts/lib/resolve-dev-tools-root.sh` (honors `BLOCKERA_DEV_TOOLS_ROOT`)
3. Explicit env / `with:` / CLI flag the consumer sets

## Cursor docs and commands

Origin path first, then “consumers: `packages/global-packages/` + that path”. Do not document only the consumer prefix.

## Allowed hardcoding

- **Consumer thin workflows** under a product `.github/workflows/` — they only run in the product repo.
- **README examples** that show a consumer `uses:` / `run:` block.
- **`root-configs/` copies** that `project:bootstrap` writes to the **product root** and `require('./packages/global-packages/…')` because those files execute at the consumer root, not inside this package.

## GitHub CI

Adding or changing workflows / shared GitHub files: Cursor command `refactor-github-ci`. Policy: `packages/dev-tools/github/README.md`.
