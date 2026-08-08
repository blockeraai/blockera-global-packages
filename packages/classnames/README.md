# `@blockera/classnames`

CSS classname generators for Blockera UI (roots, controls, fields, components, extensions).

Use these helpers instead of hand-writing `blockera-*` prefixes so class contracts stay consistent across inspector, controls, and extensions.

---

## Why it exists

Blockera UI relies on stable, section-prefixed class strings. Central generators prevent drift (`blockera-control-…` vs ad-hoc names) and compose conditional classes via `clsx`.

---

## Package layout

```text
packages/classnames/
├── js/
│   ├── index.js
│   └── defaults/*.json
├── php/                      # Security stub only (no library API)
├── package.json              # @blockera/classnames
└── composer.json             # blockera/classnames
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/classnames` | `js/index.js` |
| PHP | `blockera/classnames` | No usable PHP API today |

---

## JS API

```js
import {
	classNames,
	getClassnames,
	getClassNames,
	getInnerClassNames,
	controlClassNames,
	fieldsClassNames,
	componentClassNames,
	extensionClassNames,
} from '@blockera/classnames';

const className = controlClassNames( 'range', { active: true } );
```

| Export | Role |
|--------|------|
| `classNames` | Plain `clsx` composition |
| `getClassnames` | Configurable prefixing |
| `getClassNames` / `getInnerClassNames` | Root `blockera` classes |
| `control*`, `fields*`, `component*`, `extension*ClassNames` | Section-specific generators |

---

## Agent rules

- Prefer section helpers (`controlClassNames`, …) over raw string prefixes.
- `prepareClassName()` may mutate array inputs while prefixing the first item — do not pass arrays you must keep unchanged.
- Composer maps `Blockera\Classnames\` but there are no PHP library classes yet; do not invent PHP usage.

---

## Related packages

- `@blockera/controls`, `@blockera/editor`, `@blockera/wordpress` — primary consumers
- `@blockera/utils` — dependency
