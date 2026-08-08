# `@blockera/dev-playwright`

Playwright helpers and WordPress global-setup utilities for Blockera E2E tests.

Intended as the Playwright counterpart to `@blockera/dev-cypress`. Canonical source in `blockera-global-packages`; synced via `blockera-folder-sync.json`.

---

## Why it exists

Share editor/control/responsive helpers and authentication setup across Blockera products without duplicating Playwright glue in every repo.

---

## Package layout

```text
packages/dev-playwright/
├── js/
│   ├── index.js                 # Root aggregator (see caveat below)
│   ├── helpers.js
│   ├── support/
│   │   ├── index.js
│   │   └── commands.js          # Custom command-style helpers
│   ├── utils/                   # Domain utilities + helpers.js barrel
│   └── config/
│       ├── global-setup.ts      # WP RequestUtils auth + reset
│       └── flaky-tests-report.ts
└── package.json                 # @blockera/dev-playwright
```

This package does **not** ship a full `playwright.config.js` — consumers own the config and point at these helpers/setup files.

---

## Working imports (prefer these)

```js
const {
	addBlockToPost,
	selectBlock,
} = require( '@blockera/dev-playwright/js/utils/helpers' );

const {
	resetPanelSettings,
} = require( '@blockera/dev-playwright/js/utils/admin' );

const {
	setDeviceType,
} = require( '@blockera/dev-playwright/js/utils/responsive' );

const {
	setBoxSpacingSide,
} = require( '@blockera/dev-playwright/js/utils/controls-box-spacing' );

const commands = require( '@blockera/dev-playwright/js/support/commands' );
```

### Utility modules

| Module | Role |
|--------|------|
| `utils/editor.js` | Blocks, content, editor chrome |
| `utils/admin.js` | Admin panel helpers |
| `utils/inner-blocks.js` | Inner blocks |
| `utils/block-states.js` | Block states |
| `utils/responsive.js` | Breakpoints / device type |
| `utils/controls*.js` | Control helpers (box position/spacing, …) |
| `utils/site-navigation.js` | Site navigation |
| `utils/create-term.js` | Taxonomy terms |
| `utils/other.js` | Misc |
| `utils/helpers.js` | Re-exports all utilities |

### Global setup

`js/config/global-setup.ts` authenticates via WordPress `RequestUtils`, activates test theme (e.g. Blockera One), and resets test data/preferences. Point the consumer Playwright config’s `globalSetup` at this file (or a thin wrapper).

---

## Root entry caveat

`js/index.js` currently requires `./fixtures/editor`, but **`js/fixtures/` does not exist**. Therefore:

```js
require( '@blockera/dev-playwright' ); // fails today
```

Until fixtures land, use the subpath imports above. Do not document or rely on a missing `js/support/e2e.js` either — only `support/commands.js` and `support/index.js` are present.

---

## Agent rules

- Use Playwright locators and `page` parameters — do not copy Cypress chaining APIs blindly.
- Prefer WordPress `RequestUtils` for auth/reset over bespoke browser login.
- Keep iframe vs post-editor DOM compatibility paths when editing helpers.
- Screenshot helpers may alter the rendered UI — reset deliberately.
- Edit here, then sync to consumers — do not maintain divergent forks.

---

## Related packages

- `@blockera/dev-cypress` — Cypress twin (more mature helper surface)
- `@wordpress/e2e-test-utils-playwright`, `@playwright/test`
- Root scripts: `test:e2e:base`, `test:e2e:base:ui` (consumer `playwright.config.js`)
