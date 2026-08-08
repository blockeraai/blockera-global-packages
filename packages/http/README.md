# `blockera/http`

PHP abstraction for WordPress REST route registration and controller conventions.

npm package name `@blockera/http` exists for monorepo parity, but there is **no JS API** (`package.json` has no `main`).

---

## Why it exists

Blockera products register many REST endpoints. This package standardizes:

- Route registration (`Routes`)
- Controller base class (`RestController`) with permission/response helpers
- Optional REST-full method contracts (`RestfullAPI` — spelling is intentional for BC)

---

## Package layout

```text
packages/http/
├── php/
│   ├── API.php                 # Interface (Foundation\Http namespace)
│   ├── RestController.php
│   ├── RestfullAPI.php         # Interface (keep spelling)
│   └── Routes.php
├── package.json                # @blockera/http
└── composer.json               # blockera/http
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/http` | None |
| PHP | `blockera/http` | PSR-4 `Blockera\Http\` → `php/` |

---

## PHP API

### `Routes`

```php
$routes->setVersion( 'v1' );
$routes->post( '/telemetry', [ OptInController::class, 'optIn' ] );
$routes->register();
```

Common methods: `register()`, `get()`, `post()`, `update()`, `delete()`, `setVersion()`, `getRoutes()`.

Requires the Blockera application container and a WordPress `Sender`-style HTTP client in the broader app wiring.

### `RestController` (abstract)

- `permission()` — define capability / nonce checks (required for every controller)
- `response()` — standardize REST responses
- `url()`, `setMethod()`, `setCacheInstance()`

> Base responses may include exception trace details. Do not treat the default error formatter as a hardened public API without review.

### `RestfullAPI` interface

Contract methods: `index`, `create`, `update`, `delete`. **Do not rename** the `RestfullAPI` spelling — it is a compatibility contract.

---

## Agent rules

- Always define strict `permission()` checks on controllers.
- Prefer registering routes through `Routes` inside a service provider (e.g. `RestAPIProvider`), not ad-hoc `register_rest_route` copies.
- No JS imports from this package.

---

## Related packages

- `blockera/bootstrap` — application container / providers
- `blockera/exceptions` — shared exception type
- `@blockera/telemetry` — REST controllers extending `RestController`
- `@blockera/wordpress` — `Sender` and related WP integrations
