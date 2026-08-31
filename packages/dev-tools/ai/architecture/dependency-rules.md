# Dependency and API rules

## Public JS

Most packages expose `"main": "js/index.js"` (features: `src/index.js`). Almost none use an `exports` map except `@blockera/global-styles-ui`. Prefer that public entry and named exports documented in the package README.

- Do not deep-import private files unless an existing in-repo consumer already does and there is no public export.
- Do not invent a parallel helper when a public export already solves it.

## Public PHP

Composer name `blockera/<pkg>`. PSR-4 `Blockera\…` to `php/` (features: `src/`). Many packages also autoload `functions.php` / `helpers.php`. Prefer those symbols.

## Side-effect entries

Do not import as libraries or boot twice:

- `@blockera/blockera`
- `@blockera/blockera-admin`
- `@blockera/plugin-compatibility`

`@blockera/controls` (repeater store), `@blockera/feature-icon` (upload handler), and some `@blockera/editor` submodules also register on import — follow existing call sites.

## Unstable APIs

Treat `unstable*` bootstraps (`data`, `editor`, `features-core`) as non-stable. Copy patterns from current boot call sites.

## Product dependencies

Do not add npm/Composer libraries to package or product manifests unless the user explicitly asks. Shared packages are consumed via `file:` and Composer path repos from the product. See [../workflows/product-scripts-and-deps.md](../workflows/product-scripts-and-deps.md).
