# `@blockera/controls`

Shared React control library for Blockera inspector, popovers, style editors, repeaters, media, code, and value-addons.

Use these components instead of inventing one-off control UIs in feature packages.

---

## Why it exists

Blockera’s style/extension system needs a consistent controlled-component contract (value shapes, value-addons, repeater store, classnames). This package is that shared UI layer.

---

## Package layout

```text
packages/controls/
├── js/
│   ├── index.js                 # Public root
│   ├── api/ context/ libs/
│   ├── store/                   # Control / repeater data store
│   ├── value-addons/
│   ├── global-styles-compat/
│   └── types/
├── php/                         # Security stub only
├── package.json                 # @blockera/controls
└── composer.json                # blockera/controls
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/controls` | `js/index.js` |
| PHP | `blockera/controls` | No usable PHP API today |

Direct npm deps of note: `@monaco-editor/react`, `paper`.

---

## JS API (high level)

```js
import {
	blockeraBootstrapControls,
	RangeControl,
	RepeaterControl,
	ValueAddonControl,
	ColorControl,
	BackgroundControl,
	BoxBorderControl,
	BoxShadowControl,
	CodeControl,
	BaseControl,
	Flex,
	Popover,
} from '@blockera/controls';
```

| Group | Examples |
|-------|----------|
| Foundation | `Flex`, `Grid`, `Button`, `Modal`, `Popover`, `Tooltip`, `Tabs`, `BaseControl` |
| Inputs | `InputControl`, `TextAreaControl`, `SelectControl`, `ToggleControl`, `RangeControl`, `ColorControl`, `MediaUploader` |
| Style | `BackgroundControl`, `BorderControl`, `BoxBorderControl`, `BorderRadiusControl`, `BoxShadowControl`, `TextShadowControl`, `TransformControl`, `TransitionControl`, `FilterControl`, `MaskControl`, `LayoutMatrixControl` |
| Composite | `RepeaterControl`, `ValueAddonControl`, `FeatureWrapper`, `UpgradePrompt`, `Promoter`, `RendererControl`, `CodeControl` |
| Store | `store`, `actions`, `reducer`, `selectors`, `STORE_NAME` |
| Bootstrap | `blockeraBootstrapControls()` |

Root also exports `api`, `context`, value-addons, types, and text-shadow CSS compatibility helpers.

---

## Agent rules

- Importing `libs` can register the repeater data store as a **side effect**.
- Preserve controlled-component props and existing value-addon value shapes.
- Prefer root public exports; do not deep-import private internal files unless already done elsewhere.
- Composer maps `Blockera\Controls\` but PHP is a stub — do not invent PHP control classes here.

---

## Related packages

- `@blockera/classnames`, `@blockera/data`, `@blockera/data-editor`, `@blockera/utils`
- `@blockera/editor`, `@blockera/global-styles-ui`, `@blockera/icons`
