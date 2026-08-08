# `@blockera/telemetry`

Opt-in telemetry, product/site registration, token refresh jobs, and administrator bug reporting for Blockera products (API: api.blockera.ai).

Handles user/site data — preserve privacy, capability, and opt-in contracts carefully.

---

## Why it exists

Products need a shared, consent-aware way to:

1. Show opt-in UI
2. Register site/product with the Blockera API
3. Refresh tokens / registered site data on a schedule
4. Let admins submit bug reports with diagnostics

---

## Package layout

```text
packages/telemetry/
├── js/
│   ├── index.js
│   └── components/
│       ├── opt-in/
│       └── bug-detector-and-reporter/
├── php/
│   ├── Config.php Jobs.php
│   ├── *Controller.php          # REST
│   ├── data providers/
│   ├── functions.php hooks.php
│   └── ...
├── package.json                 # @blockera/telemetry
└── composer.json                # blockera/telemetry
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/telemetry` | `js/index.js` |
| PHP | `blockera/telemetry` | PSR-4 `Blockera\Telemetry\` + `php/functions.php` |

---

## JS API

```js
import {
	initializeTelemetryOptInSystem,
	OptInModal,
	Popup,
	Notice,
	checkReporterStatus,
	useBugReporter,
} from '@blockera/telemetry';

initializeTelemetryOptInSystem();
```

| Export | Role |
|--------|------|
| `initializeTelemetryOptInSystem()` | Mounts opt-in UI when server state permits |
| `OptInModal` + opt-in `sender()` | Opt-in flow |
| `Popup`, `Notice`, reporter `sender()`, `checkReporterStatus()`, `useBugReporter()` | Bug reporter |

> `initializeTelemetryOptInSystem()` currently assigns `window.onload`. Calling it late or alongside another `onload` owner can overwrite behavior.

---

## PHP API (high level)

| Symbol | Role |
|--------|------|
| `Blockera\Telemetry\Config` | Consumer/server/option/REST parameter config |
| `Blockera\Telemetry\Jobs` | Scheduled token refresh / registered-site updates |
| `OptInController::optIn()` | REST opt-in |
| `BugDetectorAndReporterController::{log,status}` | Authenticated diagnostics |
| `blockera_telemetry_opt_in_is_off( $slug )` | Opt-in off check |
| `blockera_telemetry_render_container()` | Admin UI container markup |

Respect flags such as `BLOCKERA_TELEMETRY_NOT_STORE_DATA` and `BLOCKERA_TELEMETRY_OPT_IN_OFF`. Enforce nonces and `manage_options` on privileged flows.

---

## Agent rules

- Never bypass opt-in or capability checks “for convenience” in tests without restoring state.
- Prefer existing REST controllers over ad-hoc `wp_remote_post` to the API.
- Admin mounts the container and initializer — see `@blockera/blockera-admin`.

---

## Related packages

- `blockera/http`, `blockera/exceptions`
- `@blockera/blockera-admin`, `@blockera/wordpress` (`Sender`)
