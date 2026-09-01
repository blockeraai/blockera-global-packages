# Inner blocks and block states

Index for selector-target and pseudo-state work. Do not copy APIs here.

Package README: [`packages/editor/README.md`](../../../editor/README.md). Style generators: [editor-style-pipeline.md](editor-style-pipeline.md). Pro overlays: [free-vs-pro.md](free-vs-pro.md).

## Model

Free owns the UI and attributes. Extra states are listed in free with `native: true` (disabled until Pro). Pro does not fork `block-card`; it flips `native` and overlays config.

## Inner blocks

| Piece | Start here |
|-------|------------|
| UI + registration | `packages/editor/js/extensions/libs/block-card/inner-blocks/` (`registerInnerBlockExtensionsSupports`) |
| Config filter | `blockera.extensions.innerBlocks.config` |
| Gutenberg element mapping | `inner-blocks/compatibility/registry.js` |
| Per-block models | `packages/blocks-core/` (`innerBlocks:` on block libs) |
| Attribute | `blockeraInnerBlocks` |
| PHP consumption | `packages/editor/php/StyleDefinitions/BaseStyleDefinition.php` (and tests under `php/Tests/`) |

## Block states

| Piece | Start here |
|-------|------------|
| UI + definitions | `packages/editor/js/extensions/libs/block-card/block-states/` (`states.js`, `unstableBootstrapBlockStatesDefinitions`) |
| Attribute | `blockeraBlockStates` |
| PHP consumption | `BaseStyleDefinition.php`, `helpers.php` (pseudo class / css-class) |

**CONFIRMED:** extra states in free `states.js` use `native: true`. Pro `packages/editor-pro/js/extensions/libs/block-states/index.js` (`applyDefaultBlockStates`) filters `blockera.editor.extensions.blockStates.availableStates` and sets `native: false` when licensed. Overlay: `editor-pro/js/extensions/config/block-states.js`.

## Tests

From the **active product** root (`npm run test:e2e -- --spec …`):

- Free: `packages/editor/js/extensions/libs/block-card/inner-blocks/test/`, `block-card/block-states/test/`
- Pro (only after Pro is in scope): `packages/editor-pro/js/extensions/libs/block-states/test/`

## Blast radius

Changing attributes, `innerBlocks:` models, or `native` gating is **CROSS-MODULE** / often **CROSS-REPOSITORY**. Ask before editing Pro (`product-scope`).
