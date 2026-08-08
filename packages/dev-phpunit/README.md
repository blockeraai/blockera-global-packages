# `@blockera/dev-phpunit` / `blockera/dev-phpunit`

WordPress-integrated PHPUnit bootstrap, shared test base class, and Spatie snapshot drivers (JSON / HTML / CSS).

---

## Why it exists

PHP unit and snapshot tests across Blockera products need:

1. A bootstrap that finds WordPress test libs (local, CI, wp-env)
2. A shared `WP_UnitTestCase` subclass
3. Deterministic HTML/CSS/JSON snapshot drivers

---

## Package layout

```text
packages/dev-phpunit/
├── php/
│   ├── bootstrap.php            # Boots WP PHPUnit; cleans stale MU plugins
│   ├── config.php               # Composer autoload + optional .env
│   ├── AppTestCase.php
│   ├── JsonDriver.php
│   ├── HtmlDriver.php
│   └── CssDriver.php
├── package.json                 # @blockera/dev-phpunit
└── composer.json                # blockera/dev-phpunit
```

---

## Usage

Wire `php/bootstrap.php` (and optionally `config.php`) through the consumer’s `phpunit.xml.dist`, then run inside wp-env / CI as the root scripts do (`vendor/bin/phpunit -c phpunit.xml.dist`).

### `AppTestCase`

Extends `WP_UnitTestCase` and provides helpers to invoke protected/private methods in tests.

### Snapshot drivers

| Driver | Notes |
|--------|-------|
| `JsonDriver` | JSON snapshots |
| `HtmlDriver` | Normalizes SVG `viewBox` and inter-tag whitespace (reduces libxml/platform noise) |
| `CssDriver` | CSS snapshots |

---

## Agent rules

- Honor bootstrap order: `WP_TESTS_DIR` → wp-env vars → system temp fallback.
- Keep HTML snapshot normalization — removing it causes cross-platform flake.
- Avoid side effects in bootstrap before WordPress `muplugins_loaded`.
- **Namespace caveat:** Composer autoload may declare a typo’d namespace (`PHPUnint`) while source uses `PHPUnit` / `PhpUnit`. Prefer matching the **source class namespaces** when writing tests; fix the Composer typo in a dedicated change if you touch autoload.

---

## Related packages

- Root `phpunit.xml.dist` / wp-env scripts
- `@blockera/dev-cypress` (parallel MU-plugin lifecycle ideas)
- `wp-phpunit`, Yoast polyfills, Spatie snapshots
