# Free vs Pro

When a Site Builder change in **blockera** (free) or GP may need **blockera-pro**. Do not copy Pro APIs here.

Product map: `blockera-pro/.ai/architecture.md`. Write-root: [../decisions/001-gp-write-root.md](../decisions/001-gp-write-root.md). Style files: [editor-style-pipeline.md](editor-style-pipeline.md). Inner blocks / states: [inner-blocks-and-block-states.md](inner-blocks-and-block-states.md).

## Model

Free owns implementations in GP (editor libs, blocks-core, controls, feature packages). Pro **overlays** or **unlocks**; it does not fork those libs.

License checks belong in Pro (`validateSecretKeys`, `window.blockeraAccount`). Do not reimplement them in GP.

## Free + Pro features (hooks)

When the user wants a feature that exists in **free** and gains extra behavior in **Pro**, design **free first** as complete on its own. Make the Pro-extension points **filterable** with `@wordpress/hooks` (`applyFilters` / `addFilter`). Do not fork the feature in Pro and do not `import` Pro from GP.

**CONFIRMED pattern:** free `applyFilters('blockera.editor.extensions.blockStates.availableStates', …)` in `packages/editor/js/extensions/libs/block-card/block-states/states.js`; Pro `addFilter` on that name in `editor-pro/js/extensions/libs/block-states/index.js` **after** the license gate. Editor bootstrap also uses `addFilter` / `applyFilters` in `packages/editor/js/extensions/hooks/index.js` (`applyHooks`).

### Free (GP / blockera)

1. Implement the default (free) behavior in GP.
2. Search existing `blockera.*` filters before adding a new name.
3. At each place Pro must change (options, UI slots, attribute defaults, which states exist):  
   `applyFilters('blockera.<area>.<feature>.<point>', freeDefault, …context)`  
   Import from `@wordpress/hooks` (same as Gutenberg).
4. Default argument = free behavior. Missing Pro or failed license must still work.
5. Prefer Gutenberg filters Pro already uses when the surface is block registration (`blocks.registerBlockType`), plus Blockera-named filters for our own data.
6. Do not add license / `blockeraAccount` / `validateSecretKeys` in GP.

### Pro (only after the user expanded scope)

1. `addFilter` the names free exposed. Keep the free file as source of truth.
2. Run that `addFilter` **only after** the product license gate (next section). Unlicensed users keep free defaults.
3. Classify **CROSS-REPOSITORY**. Ask before editing Pro (`product-scope`).

## Pro license gate (required)

Every new Pro unlock (editor extension, control hook, canvas, block-pro, admin panel) must sit **behind the same validation** as other unlocks. Do not add a shorter check (`if (window.blockeraAccount)` only) and do not skip the gate “because this is a small feature”.

**CONFIRMED template:** `blockera-pro` `packages/editor-pro/js/extensions/register.js` — the `CI_ENV` / `blockeraAccount` / `validateSecretKeys` / status / dates block **before** any `addFilter` (`registerEditorExtensions`). Same shape: `controls-pro/js/index.js` (`applyControls`), `editor-pro/js/canvas-editor/index.js` (`bootstrapCanvasEditor`), `editor-pro/js/extensions/libs/block-states/index.js` (`applyBlockStates` / `applyDefaultBlockStates`).

Copy that sequence (open the file; do not invent fields):

1. When `process.env.CI_ENV === 'false'`, run the gate; otherwise skip so CI/e2e can unlock.
2. Read `window.blockeraAccount` (and license fields). Empty account → return (dev `console.warn` only).
3. Require id, tokens, status, name, licenseKey, dates, client id/secret.
4. `status` must be `active`.
5. `validateSecretKeys` from `@blockera/validator` (`domain`, `clientId`, `clientSecret`, `licenseKey`, `subscriptionId`).
6. Name prefix / subscription dates as in `register.js`.
7. **Then** `addFilter` / merge config / apply Pro UI.

Do not reimplement secret-key math in GP or a new helper unless Pro already exports one you should reuse.

## Layers (read these, do not duplicate)

### 1. Editor extension config (`editor-pro`)

**CONFIRMED:** `packages/editor-pro/js/extensions/register.js` (`registerEditorExtensions`) adds `blocks.registerBlockType` filters that `mergeObject` each `./config` export onto `blockera.block.{blockName}.extension.{supportId}`.

Config index: `packages/editor-pro/js/extensions/config/index.js`.

Style/support overlays match free libs (`background`, `layout`, …) plus Pro-centric `spacing`, `block-states`, `icon`.

- **Spacing:** overlay on layout/spacing (`config/spacing.js`, `onNative: false`). Not a separate GP style lib.
- **Icon:** Pro `config/icon.js` gates controls (`onNative: false`). Implementation also lives in GP `@blockera/feature-icon` (`packages/features-library/icon/`). Treat both: config unlock vs feature package.
- **Block states:** see [inner-blocks-and-block-states.md](inner-blocks-and-block-states.md) (`native: true` in free → Pro sets `false`).

### 2. Controls (`controls-pro`)

`packages/controls-pro/js/index.js` (`applyControls`) hooks Pro control behavior (background, shadows, transform, filter, icon, repeater, …) behind the same license gate. Read this when a control’s paid options live outside `editor-pro` config.

### 3. Blocks (`blocks-pro`)

`packages/blocks-pro/core/` (`@blockera/blocks-pro-core`) extends core and third-party blocks (Blocksy, extra inner-block / state e2e). Pair with free `packages/blocks-core/` models. Tests live next to those block folders.

### 4. Canvas / global styles (`editor-pro` canvas)

`packages/editor-pro/js/canvas-editor/` (`bootstrapCanvasEditor`, `global-styles/`) unlocks canvas / global-styles UI. Pair with GP `packages/global-styles-ui/` and editor global-styles tests — do not assume canvas work is only a style-lib overlay.

### 5. License / auth / guard

| Package | Role |
|---------|------|
| `auth-pro` | Connect / licenses UI (`packages/auth-pro/js/`) |
| `guard` / `validator` | Secret-key and account validation used by editor-pro and controls-pro |
| `blockera-pro-admin` | Settings screens |

If the task is “why is this locked”, start here, then the overlay that sets `onNative` / `PromoComponent`.

## When to open Pro (read)

While active product is **blockera** / GP:

- The feature must exist in free **and** grow in Pro — you need the hook names and the Pro `addFilter` sites
- The control is limited, paid, or `onNative*` / extra options live in Pro
- You changed a support id, attribute, inner-block model, or feature wrapper the overlay merges
- Matching files exist under `editor-pro`, `controls-pro`, or `blocks-pro`
- Canvas, global styles unlock, or license UI is involved

## When to edit Pro

**Ask first** (`product-scope.mdc`). Do not patch Pro in the same turn as a free/GP change unless the user expanded scope. Then classify **CROSS-REPOSITORY**.

New Pro behavior: `addFilter` (or config merge) **only after** the license gate in **Pro license gate**. Match `register.js`; do not register unlocks at module top level.

## When Pro is out of scope

Toolkit licensing/OAuth on blockera.ai, One stamps, GP-only utils with no overlay, chores that do not change extension/control/block unlock.

## Tests

From the **active product** root: `npm run test:e2e -- --spec …`. Pro specs live under `blockera-pro` (`editor-pro`, `blocks-pro`, `canvas-editor`). Run those only when Pro is active or the user approved Pro work. Do not invent `npx cypress`.
