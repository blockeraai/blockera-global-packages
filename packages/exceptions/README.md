# `@blockera/exceptions` / `blockera/exceptions`

Minimal shared PHP exception types for Blockera packages.

Intentionally small: a package-level base exception so callers can catch Blockera failures without coupling to HTTP/telemetry internals.

---

## Why it exists

Shared controllers (e.g. telemetry REST) need a common exception type for expected validation/server failures. A single base class keeps catch sites stable across packages.

---

## Package layout

```text
packages/exceptions/
├── php/
│   └── BaseException.php
├── package.json              # @blockera/exceptions (no JS main)
└── composer.json             # blockera/exceptions
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/exceptions` | None (no usable JS API) |
| PHP | `blockera/exceptions` | PSR-4 `Blockera\Exceptions\` → `php/` |

---

## PHP API

```php
use Blockera\Exceptions\BaseException;

throw new BaseException( __( 'Invalid request.', 'blockera' ), 400 );
```

`BaseException` extends `\Exception` and currently adds no extra behavior. Use it when you need a package-level type distinction for catch/handling.

---

## Agent rules

- Do not invent a large exception hierarchy here unless a real cross-package need appears.
- Prefer this type over generic `\Exception` in Blockera HTTP/telemetry controllers when the failure is expected and domain-specific.
- There is no JS export — do not import this from JS bundles.

---

## Related packages

- `blockera/http` — REST controllers that may throw/serialize errors
- `@blockera/telemetry` — known consumer of `BaseException`
