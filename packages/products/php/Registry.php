<?php

namespace Blockera\Products;

/**
 * Class Registry as the object store api for Blockera products details.
 *
 * Products (blockera, blockera-pro, blockera-one theme, ...) register themselves
 * either directly through blockera_register_product() or lazily on the
 * "blockera/products/registry/init" action which fires once, on first read access.
 *
 * @since 1.0.0
 *
 * @package Blockera\Products\Registry
 */
final class Registry {

	/**
	 * Store the singleton instance.
	 *
	 * @var Registry|null $instance the registry instance.
	 */
	private static ?Registry $instance = null;

	/**
	 * Store the registered products, keyed by slug for O(1) lookups.
	 *
	 * @var array<string,Product> $products the registered products.
	 */
	private array $products = [];

	/**
	 * Whether lazy registrants ("blockera/products/registry/init") already ran.
	 *
	 * @var bool $initialized the initialization flag.
	 */
	private bool $initialized = false;

	/**
	 * Get the shared registry instance.
	 *
	 * @return Registry the registry instance.
	 */
	public static function getInstance(): Registry {

		if ( null === self::$instance ) {

			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Run lazy registrants exactly once before any read access,
	 * so registration order never affects consumers.
	 *
	 * @return void
	 */
	private function init(): void {

		if ( $this->initialized ) {

			return;
		}

		$this->initialized = true;

		/**
		 * Fires once on first read access of the products registry.
		 *
		 * Registrants should call $registry->register() (or blockera_register_product()).
		 *
		 * @since 1.0.0
		 *
		 * @param Registry $registry the products registry instance.
		 */
		do_action( 'blockera/products/registry/init', $this );
	}

	/**
	 * Register a product into the store.
	 *
	 * @param Product|array $product the product instance or raw details array.
	 *
	 * @return Product|null the registered product on success, null on invalid details.
	 */
	public function register( $product ): ?Product {

		if ( is_array( $product ) ) {

			$product = Product::create( $product );
		}

		if ( ! $product instanceof Product ) {

			return null;
		}

		$this->products[ $product->getSlug() ] = $product;

		return $product;
	}

	/**
	 * Is a product registered?
	 *
	 * @param string $slug the product slug.
	 *
	 * @return bool true when the product is registered.
	 */
	public function has( string $slug ): bool {

		$this->init();

		return isset( $this->products[ $slug ] );
	}

	/**
	 * Get a registered product.
	 *
	 * @param string $slug the product slug.
	 *
	 * @return Product|null the product instance or null when not registered.
	 */
	public function get( string $slug ): ?Product {

		$this->init();

		return $this->products[ $slug ] ?? null;
	}

	/**
	 * Get all registered products.
	 *
	 * @return array<string,Product> the registered products keyed by slug.
	 */
	public function all(): array {

		$this->init();

		return $this->products;
	}

	/**
	 * Deregister a product from the store.
	 *
	 * @param string $slug the product slug.
	 *
	 * @return bool true when the product was registered and is removed now.
	 */
	public function deregister( string $slug ): bool {

		$this->init();

		if ( ! isset( $this->products[ $slug ] ) ) {

			return false;
		}

		unset( $this->products[ $slug ] );

		return true;
	}

	/**
	 * Get all registered products details as plain arrays (localization-ready).
	 *
	 * @return array<string,array> the products details keyed by slug.
	 */
	public function toArray(): array {

		$this->init();

		$details = [];

		foreach ( $this->products as $slug => $product ) {

			$details[ $slug ] = $product->toArray();
		}

		return $details;
	}
}
