# `blockera/autoloader-coordinator`

Coordinates Composer-style autoloading across concurrently active Blockera products (plugin + Pro + companions).

Resolves duplicate shared packages by priority/version and falls back to the native Composer loader when only one product is active.

**PHP-only** — there is no npm package.

---

## Why it exists

Multiple Blockera products may ship the same Composer packages. Without coordination, the first autoloader wins and version skew breaks runtime. This package:

1. Registers each product with identity + companion descriptors
2. Merges package manifests when multiple products are active
3. Selects preferred / highest compatible versions
4. Caches the resolved map (WordPress transients; APCu when available)
5. Uses the fast native Composer path for single-product `--no-dev` installs

## Composer install vs WordPress runtime

The coordinator follows **what Composer actually installed**, not `APP_MODE` / `BLOCKERA_SB_MODE`:

| Composer command | `vendor/composer/installed.php` `root.dev` | Packages loaded |
| --- | --- | --- |
| `composer install` | `true` | `require` **and** `require-dev` |
| `composer install --no-dev` | `false` | `require` only |

That decision happens at product entry (`functions.php` / plugin bootstrap) **before** dotenv loads, so env flags are not a reliable signal.

Root `autoload-dev` (PHPUnit helpers under `tests/`) is still kept off the WordPress request path; PHPUnit bootstraps those files itself.

---

## Package layout

```text
packages/autoloader-coordinator/
├── loader.php                              # Requires coordinator class (ABSPATH guard)
├── bootstrap.php
├── class-shared-autoload-coordinator.php   # Blockera\SharedAutoload\Coordinator
├── composer.json                           # blockera/autoloader-coordinator
├── php/tests/                              # Tests for this repo's CI, not consumers
│   ├── bootstrap.php
│   ├── TestCase.php
│   ├── CoordinatorComposerInstallTest.php
│   ├── Unit/CoordinatorTest.php
│   ├── Integration/CoordinatorIntegrationTest.php
│   └── fixtures/                           # wp-env version-resolution scenarios
└── blockera-folder-sync.json
```

Composer autoload:

- PSR-4: `Blockera\SharedAutoload\` → package root
- Files: `loader.php`

---

## PHP API

### Bootstrap helper

```php
blockera_bootstrap_shared_autoloader(
	'blockera',
	__DIR__,
	[
		'priority' => 10,
		'default'  => true,
		'file'     => __FILE__,
		// Optional: companions, defer_files_until, entry_constant, plugin_file, theme support
	]
);
```

Call this **at product bootstrap**, after WordPress is available (`ABSPATH` required). Product slugs are not hard-coded in the coordinator — pass them from each product.

### `Blockera\SharedAutoload\Coordinator`

| Method | Role |
|--------|------|
| `getInstance()` | Singleton |
| `registerPlugin()` | Register a product |
| `bootstrap()` | Start coordination |
| `maybeCoordinate()` | Merge / select when needed |
| `invalidatePackageManifest()` | Clear caches after activate/deactivate/update |
| `getClassLoader()` | Access resolved loader |

---

## Agent rules

- Only use at product entry bootstrap — not from shared library code mid-request.
- After plugin activation, deactivation, or update, invalidate the package manifest cache.
- Do not hard-code Pro/companion slugs inside this package; pass them via options/filters.
- Prefer keeping this package free of feature logic — it is infrastructure only.
- PHPUnit for this package lives in `php/tests/` (Brain Monkey unit + integration + Composer-install policy) and runs in **blockera-global-packages** CI job `test-php`.
- wp-env version-resolution scenarios live in `php/tests/fixtures/` and run in the same workflow as job `coordinator-wp-env`.
- Do not add these tests to consumer `phpunit.xml.dist` suites.

---

## Related packages

Every Composer-autoloaded Blockera shared package (especially when Blockera + Blockera Pro run together).
