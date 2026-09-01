# Free vs Pro

When a Site Builder change in **blockera** (free) or GP may need **blockera-pro**. Do not copy Pro APIs here.

Product map: `blockera-pro/.ai/architecture.md`. Write-root: [../decisions/001-gp-write-root.md](../decisions/001-gp-write-root.md). Style files: [editor-style-pipeline.md](editor-style-pipeline.md). Inner blocks / states: [inner-blocks-and-block-states.md](inner-blocks-and-block-states.md).

## Model

Free owns implementations in GP (editor libs, blocks-core, controls, feature packages). Pro **overlays** or **unlocks**; it does not fork those libs.

License checks belong in Pro (`validateSecretKeys`, `window.blockeraAccount`). Do not reimplement them in GP.

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

- The control is limited, paid, or `onNative*` / extra options live in Pro
- You changed a support id, attribute, inner-block model, or feature wrapper the overlay merges
- Matching files exist under `editor-pro`, `controls-pro`, or `blocks-pro`
- Canvas, global styles unlock, or license UI is involved

## When to edit Pro

**Ask first** (`product-scope.mdc`). Do not patch Pro in the same turn as a free/GP change unless the user expanded scope. Then classify **CROSS-REPOSITORY**.

## When Pro is out of scope

Toolkit licensing/OAuth on blockera.ai, One stamps, GP-only utils with no overlay, chores that do not change extension/control/block unlock.

## Tests

From the **active product** root: `npm run test:e2e -- --spec …`. Pro specs live under `blockera-pro` (`editor-pro`, `blocks-pro`, `canvas-editor`). Run those only when Pro is active or the user approved Pro work. Do not invent `npx cypress`.
