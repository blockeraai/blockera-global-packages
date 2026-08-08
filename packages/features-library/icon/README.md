# `@blockera/feature-icon`

Blockera **Icon** feature: editor controls, custom SVG upload/rendering, front-end HTML modification, and icon CSS generation.

Implements the `@blockera/features-core` feature contract.

---

## Why it exists

Icon support spans editor UI, attribute schema (`blockeraIcon`), SVG codec compatibility, server HTML injection, and style definitions. Bundling it as a feature package keeps the core editor free of icon-specific logic.

---

## Package layout

```text
packages/features-library/icon/
├── src/
│   ├── index.js                 # JS entry (registers SVG upload handler)
│   ├── config / extension / UI
│   ├── Icon.php                 # FeatureInterface implementation
│   ├── RenderedIconCodec.php
│   ├── IconStyleDefinition.php
│   ├── EditBlockHTML.php
│   ├── functions.php hooks.php
│   └── styles / schema / tests
├── package.json                 # @blockera/feature-icon
└── composer.json                # blockera/feature-icon
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/feature-icon` | `src/index.js` |
| PHP | `blockera/feature-icon` | PSR-4 `Blockera\Feature\Icon\` (see composer.json) |

---

## JS API (high level)

```js
import {
	Icon,
	decodeRenderedIcon,
	encodeCustomSvgIcon,
	getCustomIconSvgSource,
	isCustomUploadedIcon,
	isStandaloneIconBlockContext,
	CoreIconCanvasEdit,
	CoreIconInspectorControls,
	icon,
	iconConfig,
} from '@blockera/feature-icon';
```

| Export | Role |
|--------|------|
| `Icon` | `TFeature` descriptor for the feature registry |
| Codec / helpers | `decodeRenderedIcon`, `encodeCustomSvgIcon`, `getCustomIconSvgSource`, … |
| Editor UI | `CoreIconCanvasEdit`, `CoreIconInspectorControls` |
| Config | `icon`, `iconConfig` |

The JS entry immediately calls `registerIconUploadSvgHandler()` as a side effect.

---

## PHP API (high level)

| Symbol | Role |
|--------|------|
| `Blockera\Feature\Icon\Icon` | `FeatureInterface` implementation |
| `RenderedIconCodec::{encode,decode}` | SVG payload codec (must stay editor-compatible) |
| `IconStyleDefinition` | Approved icon CSS custom properties |
| `EditBlockHTML` | Server-render HTML injection |
| `functions.php` / `hooks.php` | Autoloaded hooks |

Standalone `core/icon` rendering has a dedicated path — general HTML manipulation intentionally excludes it.

---

## Agent rules

- Keep SVG encode/decode compatible between JS and PHP codecs.
- Register through `features-core`; do not bypass the feature manager.
- Prefer `@blockera/icons` for library lookup/search; this package owns the feature lifecycle and `blockeraIcon` attributes.

---

## Related packages

- `@blockera/features-core`, `@blockera/icons`, `@blockera/editor`
- Parent container: [`../README.md`](../README.md)
