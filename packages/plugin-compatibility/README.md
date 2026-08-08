# `@blockera/plugin-compatibility`

Detects mismatched Blockera / Blockera Pro versions, disables incompatible functionality, and shows the admin compatibility screen.

---

## Why it exists

Free and Pro plugins must stay on compatible version pairs. This package centralizes:

- Version / mode checks
- Disabling the incompatible peer via filters
- Admin UI explaining the mismatch and guiding updates

---

## Package layout

```text
packages/plugin-compatibility/
├── js/
│   ├── index.js                 # Side-effect admin page mount (#root)
│   └── style.scss
├── php/
│   └── CompatibilityCheck.php
├── package.json                 # @blockera/plugin-compatibility
└── composer.json                # blockera/plugin-compatibility
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/plugin-compatibility` | `js/index.js` (app entry, not a component library) |
| PHP | `blockera/plugin-compatibility` | PSR-4 `Blockera\PluginCompatibility\` |

---

## JS usage

```js
// Bundled admin compatibility page — expects server-injected window.blockeraPlugin* fields.
import '@blockera/plugin-compatibility';
```

No named public React API. Treat as an admin-page entry point.

---

## PHP API

```php
use Blockera\PluginCompatibility\CompatibilityCheck;

$checker = new CompatibilityCheck( $args, $utils );
$checker->load();
```

`CompatibilityCheck` lifecycle (high level): constructor → `setProps()` → `load()` → `adminInitialize()` / `adminMenus()` as needed.

Required configuration typically includes: slug, path, file, version, mode, transient key, and peer plugin slug.

`load()` may attach a `{$compatible_slug}/is-enabled` → `false` filter and redirect privileged administrators to the compatibility screen.

---

## Agent rules

- Pass concrete product config — do not hard-code Pro/Free slugs inside unrelated packages.
- JS expects `window.blockeraPlugin*` globals from PHP; keep them in sync when changing the UI.
- Do not reuse this entry as a generic “notice” component.

---

## Related packages

- `@blockera/utils`
- Blockera / Blockera Pro product bootstraps and admin assets
