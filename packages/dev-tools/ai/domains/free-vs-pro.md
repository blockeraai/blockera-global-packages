# Free vs Pro

When a Site Builder editor change in **blockera** (free) or GP `@blockera/editor` may need **blockera-pro**. Do not copy Pro APIs here.

Product map: `blockera-pro/.ai/architecture.md`. Write-root: [../decisions/001-gp-write-root.md](../decisions/001-gp-write-root.md). Style files: [editor-style-pipeline.md](editor-style-pipeline.md).

## Model

Free owns the extension implementation (`packages/editor/js/extensions/libs/<lib>/` in GP). Pro **overlays** feature config; it does not fork the lib.

**CONFIRMED:** `blockera-pro` `packages/editor-pro/js/extensions/register.js` (`registerEditorExtensions`) adds `blocks.registerBlockType` filters that `mergeObject` each `./config` export onto `blockera.block.{blockName}.extension.{supportId}`. License checks live in that file; do not reimplement them. Overlay objects live in `packages/editor-pro/js/extensions/config/*.js`.

## When to open Pro (read)

While active product is **blockera** / GP editor work, **read** Pro if:

- The control is limited, paid, or `onNative*` / extra options live in Pro config
- You changed a support id, attribute, or feature wrapper the overlay merges
- The lib has a matching `editor-pro/js/extensions/config/<lib>.js`
- The work is block-states, icon, or spacing overlay (Pro-centric config files)

Config index: `packages/editor-pro/js/extensions/config/index.js`.

## When to edit Pro

**Ask first** (`product-scope.mdc`). Do not patch Pro in the same turn as a free/GP change unless the user expanded scope.

Then classify **CROSS-REPOSITORY**. Host packages besides `editor-pro`: `blocks-pro`, `controls-pro`, `auth-pro`, `guard`, etc. — see Pro `.ai/architecture.md`.

## When Pro is out of scope

Toolkit licensing/OAuth, One stamps, GP-only utils with no editor overlay, chores that do not change extension config.

## Tests

Pro e2e lives under `blockera-pro` (`packages/editor-pro/js/.../test/*.e2e.cy.js`). Run from the **Pro** product root with `npm run test:e2e -- --spec …` only after the user approved Pro edits (or you are already in Pro).
