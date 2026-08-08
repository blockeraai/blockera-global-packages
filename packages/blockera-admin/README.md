# `@blockera/blockera-admin`

WordPress admin settings / dashboard application for Blockera.

Settings panels, role/post-type visibility, block manager, breakpoints, and experimental feature toggles — mounted into the Blockera admin screen.

---

## Why it exists

Editor packages alone are not enough for product settings. This package owns the React admin app and PHP helpers that read/write `blockera_settings` and related options.

---

## Package layout

```text
packages/blockera-admin/
├── js/
│   ├── index.js                 # Side-effect boot (mount Dashboard)
│   ├── dashboard.js
│   ├── helpers.js               # Reusable helpers export
│   └── panels/components/
├── php/
│   ├── functions.php
│   ├── hooks.php
│   └── ...                      # Admin assets provider
├── package.json                 # @blockera/blockera-admin
└── composer.json                # blockera/blockera-admin
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/blockera-admin` | `js/index.js` (boot) + `helpers` |
| PHP | `blockera/blockera-admin` | PSR-4 `Blockera\Admin\` + `php/functions.php` |

---

## JS usage

```js
// Application entry — mounts <Dashboard />, registers settings entity, calls bootstrap.
import '@blockera/blockera-admin';

// For reusable logic, prefer helpers rather than the side-effect entry:
import { /* helpers */ } from '@blockera/blockera-admin';
```

Boot assumptions:

- DOM node `#blockera-admin-settings-container`
- Server-injected `window.unstableBlockeraBootstrapServerSideEntities` (and related globals)

Also registers filter `blockera.admin.before.bootstrap`.

---

## PHP API

| Function | Role |
|----------|------|
| `blockera_settings_page_template()` | Renders loading panel shell |
| `blockera_normalized_user_roles()` | Roles except administrator |
| `blockera_get_post_types()` | Public REST post types except attachments |
| `blockera_get_admin_options()` | Merged `blockera_settings` |
| `blockera_update_breakpoints()` | Normalize/persist breakpoint settings |

Example:

```php
$breakpoints = blockera_get_admin_options( [ 'general', 'breakpoints' ] );
```

> `php/hooks.php` may contain legacy-named helpers (e.g. `blockera_pro_add_custom_classes_to_menu()`). Treat names as historical; do not “fix” them without a migration plan.

---

## Agent rules

- Do not import the root entry as a component library — it bootstraps the whole admin app.
- Depend on `@blockera/bootstrap`, `@blockera/data`, `@blockera/utils`, WordPress data APIs.
- Telemetry opt-in UI is often mounted from admin — see `@blockera/telemetry`.

---

## Related packages

- `@blockera/bootstrap`, `@blockera/data`, `@blockera/blocks-core`
- `@blockera/telemetry`, `@blockera/wordpress`, `@blockera/utils`
