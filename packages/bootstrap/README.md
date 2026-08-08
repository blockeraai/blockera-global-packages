# `@blockera/bootstrap`

Minimal application bootstrap for Blockera (JS + PHP).

Use this package to start Blockera apps after WordPress DOM readiness (JS) and to build PHP applications on a service-container foundation.

---

## Why it exists

Blockera products (editor, admin, companions) need a shared, ordered startup path:

1. Register filters/providers before boot
2. Optionally run pre-DOM work
3. Wait for `domReady`, then run the bootstrap callback

PHP side provides `Application`, service providers, asset providers, and container contracts so plugins do not invent their own DI/bootstrap patterns.

---

## Package layout

```text
packages/bootstrap/
├── js/
│   └── index.js              # Public JS: initializer()
├── php/
│   ├── Application.php
│   ├── ServiceProvider.php
│   ├── AssetsProvider.php
│   └── ...                   # Container / registry helpers
├── package.json              # @blockera/bootstrap
└── composer.json             # blockera/bootstrap
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/bootstrap` | `js/index.js` |
| PHP | `blockera/bootstrap` | PSR-4 `Blockera\Bootstrap\` → `php/` |

---

## JS API

### Import

```js
import { initializer } from '@blockera/bootstrap';

initializer();
```

### `initializer()`

1. Reads `blockera.bootstrapper` via `applyFilters` (must be a function).
2. Optionally runs `blockera.bootstrapper.before.domReady`.
3. Schedules the bootstrap callback with `@wordpress/dom-ready`.

**Agent rules**

- Do **not** call `initializer()` more than once per page load.
- Register the bootstrap function with `addFilter('blockera.bootstrapper', …)` **before** calling `initializer()`.
- Do not bypass `domReady` for editor/admin UI mounts.

---

## PHP API

Primary types under `Blockera\Bootstrap\`:

| Class / concept | Role |
|-----------------|------|
| `Application` | App container / lifecycle |
| `ServiceProvider` | Register & boot services |
| `AssetsProvider` | Script/style registration patterns |
| `EntityRegistry` | Named entity registry |
| Container contracts | Binding / contextual binding helpers |

Extend providers instead of mutating globals when wiring new PHP services.

---

## Related packages

- `@blockera/blockera` — main editor application entry (calls bootstrap)
- `@blockera/blockera-admin` — admin dashboard bootstrap
- `@blockera/utils` — shared helpers used during boot
- `@blockera/wordpress` — WP-specific admin/assets integrations

---

## AI agent checklist

- [ ] Prefer filters/providers over direct side effects at import time
- [ ] Keep bootstrap order: register → `initializer()` → DOM-ready callback
- [ ] Do not treat this package as a UI component library
