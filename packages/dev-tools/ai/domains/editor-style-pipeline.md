# Editor style pipeline

Index for Blockera style/extension work. Do not copy APIs here — open the files.

Package README: [`packages/editor/README.md`](../../../editor/README.md) (`@blockera/editor` / `blockera/editor`).

## Dual engines (keep in sync)

| Side | Role | Start here |
|------|------|------------|
| JS editor preview | `CssGenerator`, lib `css-generators/`, `styles.js` | `packages/editor/js/style-engine/` |
| PHP frontend / SSR | `StyleEngine`, one class per CSS concept | `packages/editor/php/StyleDefinitions/` (`StyleDefinitionsProvider`) |
| Gutenberg / WP / global styles mapping | Do not “simplify” without tests | `packages/editor/js/extensions/libs/<lib>/compatibility/` |
| Core block attachment | Supports, shared attributes | `packages/blocks-core/` |
| Site Editor presets UI | theme.json extras | `packages/global-styles-ui/` |
| Pro unlock / extra controls | Overlay on free libs | Product `packages/editor-pro/js/extensions/config/` |

PHP is **property-level** (e.g. `BackgroundColor.php`, `FlexWrap.php`), not one class per JS lib. After changing a generator, search `StyleDefinitions/` for the same CSS property.

## Per-task path

1. Identify the JS lib under `packages/editor/js/extensions/libs/<lib>/`.
2. Read `extension.js` / `index.js`, then `compatibility/` if present.
3. Match PHP in `packages/editor/php/StyleDefinitions/`.
4. Tests: `libs/<lib>/test/*.e2e.cy.js`, `test/global-styles/` + `fixtures/*.php`.
5. If the feature is gated or extended in Pro: [free-vs-pro.md](free-vs-pro.md). **Ask** before editing Pro (`product-scope`).
6. Gutenberg behavior: product `source-codes/block-editor/` (Cursor `development-helper` / `source-code` command).

Skip steps that do not apply (e.g. no `compatibility/` folder).

## JS libs (`packages/editor/js/extensions/libs/`)

Style extensions with `extension.js`: `background`, `border-and-shadow`, `typography`, `size`, `layout`, `position`, `flex-child`, `grid-child`, `effects`, `mouse`, `custom-style`, `advanced-settings`, `conditions`, `entrance-animation`, `click-animation`, `scroll-animation`.

Shared / non-style: `base`, `shared`, `types`, `settings`, `block-card` (inner blocks / states UI), `block-composite`, `preset-preview-inference`, `preset-preview-attributes`.

**CONFIRMED compatibility adapters** (as of this note): `background`, `layout`, `size`, `typography`, `position`, `grid-child`, `custom-style`. Other libs may still have WP mapping elsewhere — search before assuming none.

## Pro config overlays (`blockera-pro`)

`packages/editor-pro/js/extensions/config/`: `background`, `border-and-shadow`, `typography`, `size`, `layout`, `position`, `flex-child`, `effects`, `mouse`, `custom-style`, `advanced-settings`, `conditions`, `entrance-animation`, `click-animation`, `scroll-animation`, plus `spacing`, `block-states`, `icon`.

`spacing` overlays layout/spacing. `block-states` and `icon` are Pro-centric; free `block-card` still owns related UI.

## Tests

From the **active product** root: `npm run test:e2e -- --spec <spec>`. Do not invent `npx cypress`. See [../workflows/product-scripts-and-deps.md](../workflows/product-scripts-and-deps.md).

## Blast radius

Changing a public attribute, generator, or StyleDefinition is **CROSS-MODULE** (and often **CROSS-REPOSITORY** if Pro overlays it). See [../workflows/change-classification.md](../workflows/change-classification.md).
