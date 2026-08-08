# `@blockera/blockera`

Application-level entry point that wires Blockera into WordPress block/site editors.

Importing this package is an **executable bootstrap**, not a utility library. It registers filters, initializes blocks/editor features, and runs the shared bootstrapper.

---

## Why it exists

Consumers (main Blockera plugin) need one ordered startup that:

1. Loads compatibility shims and server helpers (PHP)
2. Registers JS filters/hooks, blocks, and editor features
3. Calls `@blockera/bootstrap` `initializer()`

---

## Package layout

```text
packages/blockera/
├── js/
│   └── index.js                 # Side-effect entry (no named public API)
├── php/
│   ├── Blockera.php             # Blockera\Setup\Blockera
│   ├── *Provider.php            # App / assets / REST providers
│   ├── Compatibility/           # WP/Gutenberg compatibility files
│   └── functions.php            # Autoloaded helpers
├── package.json                 # @blockera/blockera
└── composer.json                # blockera/blockera
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/blockera` | `js/index.js` (side effects) |
| PHP | `blockera/blockera` | PSR-4 `Blockera\Setup\` + files autoload |

---

## JS usage

```js
// Bundled as the editor application entry — do not import as helpers.
import '@blockera/blockera';
```

There is no intentional named public API. Treat the file as a boot script.

---

## PHP API (high level)

| Symbol | Role |
|--------|------|
| `Blockera\Setup\Blockera` | Application root |
| `EditorAssetsProvider` / `AppServiceProvider` / `RestAPIProvider` | Service wiring |
| REST controllers | Admin/editor HTTP endpoints |
| Compatibility classes/files | Layout, typography, fonts, global styles, template parts, … |
| `blockera_core_config()` and related helpers | Config / cache / CSS helpers |

---

## Agent rules

- Do **not** import this module twice or use it as a grab-bag of utilities.
- Preserve bootstrap ordering; do not reorder side effects casually.
- Prefer extending via providers, hooks, and `@blockera/editor` / `@blockera/blocks-core` APIs rather than patching this entry.
- Mutates WordPress hooks, data stores, and `window` — expect global side effects.

---

## Related packages

- `@blockera/bootstrap`, `@blockera/editor`, `@blockera/blocks-core`
- `@blockera/features-core`, `@blockera/data`, `@blockera/controls`
- `@blockera/utils`, `@blockera/wordpress`
