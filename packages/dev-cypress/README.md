# `@blockera/dev-cypress`

Shared Cypress configuration helpers, custom commands, plugins, and WordPress/Blockera E2E utilities.

Canonical source in `blockera-global-packages`; synced to consumers via `blockera-folder-sync.json`.

---

## Why it exists

Blockera, Blockera Pro, themes, and companions share the same E2E patterns (create post, add block, set controls, responsive, storage). This package is the single source for those helpers and Cypress Node tasks.

---

## Package layout

```text
packages/dev-cypress/
├── js/
│   ├── helpers/                 # Domain helpers (editor, controls, …)
│   ├── helpers.js               # Barrel
│   ├── support/                 # commands, e2e bootstrap, CT support
│   ├── plugins/index.js         # setupNodeEvents + tasks
│   └── webpack.config.js        # Component-test webpack
├── php/
│   └── functions.php            # Composer placeholder
├── package.json                 # @blockera/dev-cypress
└── composer.json                # blockera/dev-cypress
```

> `package.json` declares `main: "js/index.js"`, but that file may be absent. Prefer **subpath imports** below.

---

## Usage

```js
import { createPost, addBlockToPost } from '@blockera/dev-cypress/js/helpers';
```

Wire in the consumer Cypress config:

- Support: `@blockera/dev-cypress/js/support/e2e.js` (commands, login/session, viewport)
- Plugins: `@blockera/dev-cypress/js/plugins/index.js` (`setupNodeEvents`, report/MU-plugin/cache tasks)
- Component tests: `@blockera/dev-cypress/js/webpack.config.js`

Helper modules under `js/helpers/` include: `editor`, `controls`, `controls-box-spacing`, `controls-box-position`, `responsive`, `global-styles`, `admin`, `storage`, `companion-plugin`, `inner-blocks`, `block-states`, `site-navigation`, and more.

---

## Agent rules

- Import a narrow helper path when possible; use the barrel for general helpers.
- Cypress must resolve tooling from the **consumer project root**.
- Preserve CI vs local wp-env differences in plugin tasks.
- Component tests intentionally stub `@wordpress/dataviews` and `@wordpress/commands` — do not remove without understanding CT failures.
- Edit here, then sync — do not fork divergent copies in consumers.

---

## Related packages

- `@blockera/dev-playwright` — Playwright counterpart
- `@blockera/dev-jest` — unit tests
- `@blockera/storage` — storage helpers used in E2E
