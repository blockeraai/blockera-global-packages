# `@blockera/data-editor`

Cross-language helpers to **read and update nested property values** via tokenized / dotted path queries.

Use this when you need path-based access into config objects, control trees, or experimental settings — not as a general data store.

---

## Why it exists

Blockera stores deeply nested editor/state/config objects. JS and PHP need the same mental model for “get/set by path” so env, controls, and server utilities stay aligned.

> The older README snippet about `registerBlockExtension` is outdated; that API is not what this package exports.

---

## Package layout

```text
packages/data-editor/
├── js/
│   ├── index.js
│   ├── prepare/
│   ├── update/
│   └── utils/
├── php/
│   └── Utility.php
├── package.json              # @blockera/data-editor
└── composer.json             # blockera/data-editor
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/data-editor` | `js/index.js` |
| PHP | `blockera/data-editor` | PSR-4 `Blockera\DataEditor\` |

---

## JS API

```js
import {
	prepare,
	update,
	getPropPath,
	accumulator,
	toArray,
	regexMatch,
	getNormalizedControlParentId,
} from '@blockera/data-editor';

const value = prepare( 'settings.color', config );
const next = update( config, 'settings.color', '#000' );
```

| Export | Role |
|--------|------|
| `prepare(query, dataset)` | Resolve a path query against a dataset |
| `update(object, query, value, forceReplace?)` | Set a nested property |
| `getPropPath` / `accumulator` / `toArray` | Traversal helpers |
| `regexMatch` / `getNormalizedControlParentId` | Parsing / control-id helpers |

---

## PHP API

```php
use Blockera\DataEditor\Utility;

$value = Utility::arrayGet( $config, [ 'settings', 'color' ], $default );
```

---

## Agent rules

- Despite `sideEffects: false`, `update()` **mutates nested objects/arrays** before returning a shallow-cloned root. Do not use it where strict immutability is required without cloning first.
- Keep path syntax consistent with `@blockera/env` experimental queries.
- This is not `@blockera/data` (entities/variables store) and not a block-extension registrar.

---

## Related packages

- `@blockera/env` — experimental config path reads
- `@blockera/utils` — JS dependency
- `@blockera/data`, `@blockera/controls` — consumers of path helpers
