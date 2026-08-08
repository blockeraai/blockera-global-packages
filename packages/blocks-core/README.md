# `@blockera/blocks-core`

Compatibility and extension definitions for WordPress core blocks, WooCommerce blocks, and selected third-party block libraries.

Registers Blockera extensions on top of existing blocks — it does **not** replace core block implementations.

---

## Why it exists

Blockera’s inspector/style system must attach shared attributes, supports, and per-block configs to many upstream blocks. This package owns those definitions (JS registration + PHP shared attributes / editor styles).

---

## Package layout

```text
packages/blocks-core/
├── js/
│   ├── index.js
│   ├── api/registration.js
│   ├── libs/
│   │   ├── wordpress/
│   │   ├── woocommerce/
│   │   └── third-party/
│   ├── helpers/
│   └── ...
├── php/
│   ├── libs/                    # Per-block server code
│   ├── shared/attributes.php
│   └── functions.php
├── test/
├── package.json                 # @blockera/blocks-core
└── composer.json                # blockera/blocks-core
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/blocks-core` | `js/index.js` |
| PHP | `blockera/blocks-core` | PSR-4 `Blockera\Blocks\Core\` + `php/functions.php` |

---

## JS API

```js
import {
	registerBlockeraBlocks,
	registerBlockeraBlockType,
	registerBlockeraBlockTypes,
	registerBlockeraBlockVariation,
	registerBlockeraBlockVariations,
	registerConfigExtensionsOfInnerBlocks,
	blockeraBootstrapBlocks,
	generateUuid4,
} from '@blockera/blocks-core';

registerBlockeraBlocks();
```

| Export | Role |
|--------|------|
| `registerBlockeraBlocks()` | Register all supported block extensions via `@blockera/editor` |
| `registerBlockeraBlockType(s)` | WP block type registration wrappers |
| `registerBlockeraBlockVariation(s)` | Variations + extension-support filters |
| `registerConfigExtensionsOfInnerBlocks()` | Merge nested-block extension config |
| `blockeraBootstrapBlocks` / default export | Descriptor maps |
| `generateUuid4()` | UUID helper |

Also re-exports `helpers`, `api/registration`, and `libs/general-block-features`.

---

## PHP API

| Function | Role |
|----------|------|
| `blockera_get_available_blocks()` | Cached supported-block map (injected into editor) |
| `blockera_get_shared_block_attributes()` / `blockera_get_supports()` | Shared extension attribute/support defs |
| `blockera_enqueue_blocks_editor_styles()` | Per-block editor styles (iframe assets) |
| `blockera_get_block_library_name()` | Maps core / woocommerce / third-party |
| `blockera_add_block_category()` | “Blockera Blocks” inserter category |

---

## Agent rules

- Prefer adding/adjusting a block definition under `js/libs/{wordpress,woocommerce,third-party}/` rather than patching Gutenberg block settings directly.
- Definitions expect Blockera editor stores/hooks — do not run registration outside the Blockera boot path.
- Package is large; document libraries and patterns, don’t enumerate every block file in call sites.
- `packages/blocks-library` is a **stub** — real block extension work lives here (and feature packages).

---

## Related packages

- `@blockera/editor`, `@blockera/blockera`, `@blockera/features-core`
- `@blockera/utils`, `@blockera/controls`
