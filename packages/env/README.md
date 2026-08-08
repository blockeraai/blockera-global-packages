# `@blockera/env`

Read experimental / project configuration values in JS and PHP.

This is a **config-query** abstraction (tokenized paths into experimental JSON), not a dotenv/secrets loader for runtime credentials.

---

## Why it exists

Blockera gates experimental features from shared JSON config. JS and PHP both need the same path-based lookup so feature flags stay aligned across editor and server.

---

## Package layout

```text
packages/env/
├── js/
│   ├── index.js
│   ├── experimental.js
│   └── dotenv.js
├── php/
│   └── functions.php
├── package.json              # @blockera/env
└── composer.json             # blockera/env
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/env` | `js/index.js` |
| PHP | `blockera/env` | `php/functions.php` (files autoload) |

---

## JS API

```js
import { experimental } from '@blockera/env';

const enabled = experimental().get('data.dynamicValue');
```

`experimental()` returns a reader whose `get(query)` resolves against `@blockera/experimental-config` (build-time alias / package). Queries use path expressions resolved via `@blockera/data-editor`.

---

## PHP API

```php
$value = blockera_get_experimental( [ 'data', 'dynamicValue' ] );
```

- Loads and memoizes production experimental JSON.
- Allows a local override only when development mode is enabled.
- Depends on `BLOCKERA_SB_PATH` (and optionally `BLOCKERA_SB_MODE`) plus `Blockera\DataEditor\Utility`.

---

## Agent rules

- Do **not** use this package for secrets, API keys, or OS environment variables.
- Keep JS query strings and PHP path arrays in sync for the same flag.
- Prefer gating new experimental UI behind `experimental().get(...)` instead of hard-coding `true`.

---

## Related packages

- `@blockera/data-editor` — path resolution
- `@blockera/data`, `@blockera/editor`, `@blockera/global-styles-ui` — feature gating consumers
