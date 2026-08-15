## Unreleased

## 1.0.0 (2026-08-15)

### New Features:

- Added the Blockera products details registry package with php and javascript sides.
- Added php `Registry` object store api with `Product` immutable value object validated against `product-details.schema.json`.
- Added public php api: `blockera_register_product`, `blockera_deregister_product`, `blockera_get_product`, `blockera_get_products`, `blockera_products_registry`, `blockera_products_localize`.
- Added localization of registered products details for the `@blockera/products` script handle (`window.blockeraProductsData`).
- Added the `blockera/products` store api with shared selectors around blockera and blockera-admin contexts.
- Added PHPUnit coverage for the `Product` value object, `Registry` object store api, public functions, and localization.
