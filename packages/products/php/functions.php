<?php
/**
 * The Blockera products registry public api.
 *
 * @package blockera/products/php/functions.php
 */

use Blockera\Products\Product;
use Blockera\Products\Registry;

if ( ! function_exists( 'blockera_products_registry' ) ) {

	/**
	 * Get the shared products registry (object store api).
	 *
	 * @since 1.0.0
	 *
	 * @return Registry the products registry instance.
	 */
	function blockera_products_registry(): Registry {

		return Registry::getInstance();
	}
}

if ( ! function_exists( 'blockera_register_product' ) ) {

	/**
	 * Register a Blockera product details into the registry.
	 *
	 * The accepted shape is documented in `product-details.schema.json`.
	 * Required keys: name, slug, version, type, status, isCompanion.
	 *
	 * @since 1.0.0
	 *
	 * @param array $details the product details.
	 *
	 * @return Product|null the registered product on success, null on invalid details.
	 */
	function blockera_register_product( array $details ): ?Product {

		return Registry::getInstance()->register( $details );
	}
}

if ( ! function_exists( 'blockera_deregister_product' ) ) {

	/**
	 * Deregister a Blockera product from the registry.
	 *
	 * @since 1.0.0
	 *
	 * @param string $slug the product slug.
	 *
	 * @return bool true when the product was registered and is removed now.
	 */
	function blockera_deregister_product( string $slug ): bool {

		return Registry::getInstance()->deregister( $slug );
	}
}

if ( ! function_exists( 'blockera_get_product' ) ) {

	/**
	 * Get a registered Blockera product details.
	 *
	 * @since 1.0.0
	 *
	 * @param string $slug the product slug.
	 *
	 * @return array|null the product details or null when not registered.
	 */
	function blockera_get_product( string $slug ): ?array {

		$product = Registry::getInstance()->get( $slug );

		return $product ? $product->toArray() : null;
	}
}

if ( ! function_exists( 'blockera_get_products' ) ) {

	/**
	 * Get all registered Blockera products details.
	 *
	 * @since 1.0.0
	 *
	 * @return array<string,array> the products details keyed by slug.
	 */
	function blockera_get_products(): array {

		return Registry::getInstance()->toArray();
	}
}

if ( ! function_exists( 'blockera_products_localize' ) ) {

	/**
	 * Get the localization payload for the "@blockera/products" javascript package.
	 *
	 * @since 1.0.0
	 *
	 * @return array the localization payload.
	 */
	function blockera_products_localize(): array {

		/**
		 * Filterable localized products payload,
		 * For external developers to extending the products details exposed to javascript.
		 *
		 * @since 1.0.0
		 */
		return apply_filters(
			'blockera/products/localize',
			[
				'products' => blockera_get_products(),
			]
		);
	}
}

if ( ! function_exists( 'blockera_products_l10n' ) ) {

	/**
	 * Localize registered products for the "@blockera/products" script handle.
	 *
	 * The payload is exposed as `window.blockeraProductsData` before the package
	 * script executes; the javascript package bootstraps it into the
	 * "blockera/products" store api on dom ready (see js/index.js).
	 *
	 * @since 1.0.0
	 *
	 * @return void
	 */
	function blockera_products_l10n(): void {

		// Static guard: "admin_enqueue_scripts" can run for multiple contexts in one request.
		static $localized = false;

		if ( $localized || ! wp_script_is( '@blockera/products', 'registered' ) ) {

			return;
		}

		$localized = true;

		wp_add_inline_script(
			'@blockera/products',
			'var blockeraProductsData = ' . wp_json_encode( blockera_products_localize() ) . ';',
			'before'
		);
	}
}
