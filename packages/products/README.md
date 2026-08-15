# `@blockera/products`

The Blockera products details registry. The php side owns registration, the object store api, and localization; the javascript side registers the localized details into the `blockera/products` store api and provides selectors shared around blockera (editor) and blockera-admin contexts.

The accepted product details shape is documented in [`product-details.schema.json`](./product-details.schema.json). Required fields: `name`, `slug`, `version`, `type`, `status`, `isCompanion`.

---

## Why it exists

Blockera ships multiple products (the free plugin, pro plugin, blockera-one theme, ...). Each context (editor, admin) needs one shared, authoritative place to answer:

1. Which Blockera products are installed and what are their details?
2. Is the companion plugin present and active?
3. Which version of a given product is running?

## PHP usage

Register a product (any time, or lazily on the registry init action):

```php
// Direct registration.
blockera_register_product(
	[
		'name'        => 'Blockera Site Builder',
		'slug'        => 'blockera',
		'version'     => '1.12.2',
		'type'        => 'plugin',
		'status'      => 'active',
		'isCompanion' => true,
	]
);

// Or lazily, fired once on first read access of the registry.
add_action(
	'blockera/products/registry/init',
	static function ( \Blockera\Products\Registry $registry ): void {
		$registry->register( [ /* details */ ] );
	}
);
```

Read from the object store api:

```php
$registry = blockera_products_registry();

blockera_get_product( 'blockera' ); // ?array
blockera_get_products();            // array<string,array> keyed by slug.
$registry->get( 'blockera' );       // ?\Blockera\Products\Product
```

### Localization

`blockera_products_l10n()` (hooked on `admin_enqueue_scripts`) exposes the registered products as `window.blockeraProductsData` before the `@blockera/products` script handle, and the javascript package bootstraps it into the store on dom ready. The payload is filterable via `blockera/products/localize`.

## JavaScript usage

```js
import { select, useSelect } from '@wordpress/data';
import { STORE_NAME } from '@blockera/products';

// Anywhere (blockera editor or blockera-admin context):
const products = select(STORE_NAME).getProducts();
const blockera = select(STORE_NAME).getProduct('blockera');
const isActive = select(STORE_NAME).isCompanionActive();

// In components:
const themeProducts = useSelect(
	(select) => select(STORE_NAME).getProductsByType('theme'),
	[]
);
```

Available selectors: `getProducts`, `getProduct`, `hasProduct`, `getProductVersion`, `getProductsByType`, `getProductsByStatus`, `getCompanionProduct`, `isCompanionActive`.

Actions: `registerProduct`, `registerProducts`, `unregisterProduct`.

A version-independent bridge is also exposed for inline scripts: `window.blockeraProducts.select` and `window.blockeraProducts.unstableBootstrapServerSideProducts`.
