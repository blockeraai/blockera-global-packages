# `@blockera/utils`

Shared low-level helpers for Blockera JavaScript and PHP applications.

Framework-neutral utilities: type checks, object/array ops, casing, CSS lengths, editor/DOM helpers, React hooks, and WordPress request helpers. Prefer this package over ad-hoc helper copies.

---

## Why it exists

Almost every Blockera package needs the same primitives (`isEmpty`, deep merge, CSS length normalize, iframe lookup, etc.). Centralizing them keeps editor, controls, PHP renderers, and tests consistent.

---

## Package layout

```text
packages/utils/
├── js/
│   ├── index.js              # Public barrel
│   ├── is/                   # Type / emptiness checks
│   ├── get/ array/ object/ string/
│   ├── css-length/ color/ angle/
│   ├── editor/ site-editor/ portal/
│   ├── use-*                 # React hooks
│   └── ...
├── php/
│   ├── Utils.php View.php Env.php
│   ├── Adapters/
│   └── functions.php         # Global helpers (Composer files autoload)
├── package.json              # @blockera/utils
└── composer.json             # blockera/utils
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/utils` | `js/index.js` |
| PHP | `blockera/utils` | PSR-4 `Blockera\Utils\` + `php/functions.php` |

---

## JS API (high level)

```js
import {
	noop,
	isEmpty,
	isObject,
	isString,
	omit,
	mergeObject,
	normalizeCssLengthValue,
	getIframe,
	isSiteEditorUrl,
	useOutsideClick,
	useValue,
	useIsVisible,
	useDragValue,
	useLateEffect,
} from '@blockera/utils';
```

Exports are grouped by folder (`is`, `get`, `memo`, `array`, `color`, `css-length`, `angle`, `editor`, `site-editor`, `portal`, `object`, `string`, `general`, hooks, `change-case`). Prefer named imports from the package root.

---

## PHP API

| Symbol | Role |
|--------|------|
| `Blockera\Utils\Utils` | General utilities |
| `Blockera\Utils\View` | View/rendering helpers |
| `Blockera\Utils\Env` | Env helpers |
| `Blockera\Utils\Adapters\DomParser` | DOM parsing adapter |
| `blockera_get_array_deep_merge()` | Deep-merge arrays |
| Request-context helpers | Memoized per PHP request |
| `bdd()` | Debug dump + terminate — **local debugging only** |

---

## Agent rules

- Do **not** use `bdd()` in production code or leave it in commits.
- Request-context helpers memoize for the PHP request; later global changes are not re-read.
- Prefer `@blockera/utils` over inventing parallel helpers in feature packages.
- Keep helpers side-effect free unless documented otherwise.

---

## Related packages

Foundational dependency of `bootstrap`, `classnames`, `controls`, `data-editor`, `editor`, `wordpress`, and most other packages.
