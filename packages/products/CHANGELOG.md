## Unreleased

### Bug Fixes:

- Fixed PHP product registrants never running: `blockera/products/registry/init` now also fires on `wp_loaded` via `blockera_products_bootstrap()`, so registration no longer depends on JS localization finding a script handle.
- Fixed products localization never attaching on the block editor: `blockera_products_l10n()` now also runs on `enqueue_block_editor_assets` (editor scripts are not registered on `admin_enqueue_scripts`).
- Fixed products localization never attaching: the assets loader registers version-suffixed script handles (e.g. `@blockera/products-1-0-0`), so `blockera_products_l10n()` now resolves the exact registered handle via the new `blockera_products_script_handle()` helper.

### Automated Tests

- Changed the "Tests" folder name to "tests" so everything works smoothly behind the scenes.

## 1.0.0 (2026-08-15)

### New Features:

- Added the Blockera products details registry package with php and javascript sides.
- Added php `Registry` object store api with `Product` immutable value object validated against `product-details.schema.json`.
- Added public php api: `blockera_register_product`, `blockera_deregister_product`, `blockera_get_product`, `blockera_get_products`, `blockera_products_registry`, `blockera_products_localize`.
- Added localization of registered products details for the `@blockera/products` script handle (`window.blockeraProductsData`).
- Added the `blockera/products` store api with shared selectors around blockera and blockera-admin contexts.
- Added PHPUnit coverage for the `Product` value object, `Registry` object store api, public functions, and localization.
