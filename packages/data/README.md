# `@blockera/data`

Central data module for Blockera entities, variable definitions, dynamic values, theme.json preset resolution, and WordPress data-store access.

---

## Why it exists

Editor UI, controls, and PHP value-addons need one place for:

- Server-injected entity / variable / dynamic-value definitions
- Tokenized variable strings (`generateVariableString`, `parseVarString`, …)
- theme.json preset parsing and CSS value resolution
- A `@wordpress/data` store (`blockera/data`)

---

## Package layout

```text
packages/data/
├── js/
│   ├── index.js
│   ├── entities/ variables/ dynamic-values/
│   ├── store/
│   └── types/
├── php/
│   ├── Cache/ ValueAddon/
│   └── functions.php          # blockera_get_cache(), blockera_init_cache()
├── package.json               # @blockera/data
└── composer.json              # blockera/data
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/data` | `js/index.js` |
| PHP | `blockera/data` | PSR-4 `Blockera\Data\` + `php/functions.php` |

---

## JS API (high level)

```js
import {
	unstableBootstrapServerSideEntities,
	unstableBootstrapServerSideVariableDefinitions,
	unstableBootstrapServerSideDynamicValueDefinitions,
	getColors,
	getValueAddonFromVarString,
	generateVariableString,
	parseVarString,
	STORE_NAME,
} from '@blockera/data';
```

| Area | Examples |
|------|----------|
| Bootstrap | `unstableBootstrapServerSideEntities`, `…VariableDefinitions`, `…DynamicValueDefinitions` |
| Store | store / actions / selectors / `STORE_NAME` (`blockera/data`) |
| Variables | color, spacing, typography, gradients, width, border-radius helpers |
| Theme JSON | preset token parse/resolve/serialize, CSS declaration resolution |
| Tokens | `generateVariableString`, `parseVarString`, `getValueAddonFromVarString` |

Importing the root creates `window.blockeraData.core` after DOM ready — do not rely on it synchronously at module evaluation time.

---

## PHP API (high level)

| Symbol | Role |
|--------|------|
| `Blockera\Data\Cache\Cache` / `Version` | Cache layer |
| `ValueAddonRegistry`, `ValueAddonType`, field types | Value-addon system |
| `blockera_get_cache()` / `blockera_init_cache()` | Global cache helpers |

---

## Agent rules

- Bootstrap server-side definitions **before** selectors that need them.
- Treat `unstable*` APIs as non-stable; prefer existing call sites’ patterns.
- This is not browser storage (`@blockera/storage`) and not path mutate helpers (`@blockera/data-editor`).

---

## Related packages

- `@blockera/controls`, `@blockera/editor`, `@blockera/env`
- `@blockera/data-editor`, `@blockera/global-styles-ui`
