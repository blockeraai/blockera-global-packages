<?php

namespace Blockera\Products;

/**
 * Class Product as immutable value object of any Blockera product details.
 *
 * The accepted shape is documented in `product-details.schema.json` at the package root.
 *
 * @since 1.0.0
 *
 * @package Blockera\Products\Product
 */
final class Product {

	/**
	 * Supported product types (as set for O(1) lookup).
	 *
	 * @var array<string,bool>
	 */
	const TYPES = [
		'plugin' => true,
		'theme'  => true,
	];

	/**
	 * Supported product lifecycle statuses (as set for O(1) lookup).
	 *
	 * @var array<string,bool>
	 */
	const STATUSES = [
		'active'     => true,
		'inactive'   => true,
		'deprecated' => true,
		'beta'       => true,
		'unreleased' => true,
	];

	/**
	 * Store the validated product details.
	 *
	 * @var array $details the product details.
	 */
	private array $details;

	/**
	 * Product constructor is private, use static create() factory instead,
	 * so invalid details can never produce a Product instance.
	 *
	 * @param array $details the validated product details.
	 */
	private function __construct( array $details ) {

		$this->details = $details;
	}

	/**
	 * Create a Product instance from raw details.
	 *
	 * Returns null instead of throwing, because "invalid registration args"
	 * is a normal flow for external registrants (see performance guidelines).
	 *
	 * @param array $details the raw product details.
	 *
	 * @return Product|null the product instance or null when required details are invalid.
	 */
	public static function create( array $details ): ?Product {

		// Required string fields per product-details.schema.json.
		foreach ( [ 'name', 'slug', 'version', 'type', 'status' ] as $field ) {

			if ( empty( $details[ $field ] ) || ! is_string( $details[ $field ] ) ) {

				return null;
			}
		}

		// "isCompanion" is required and must be a boolean.
		if ( ! isset( $details['isCompanion'] ) || ! is_bool( $details['isCompanion'] ) ) {

			return null;
		}

		// Enum validations with O(1) set lookups.
		if ( ! isset( self::TYPES[ $details['type'] ] ) || ! isset( self::STATUSES[ $details['status'] ] ) ) {

			return null;
		}

		return new self( $details );
	}

	/**
	 * Get the product unique slug.
	 *
	 * @return string the product slug.
	 */
	public function getSlug(): string {

		return $this->details['slug'];
	}

	/**
	 * Get the product public name.
	 *
	 * @return string the product name.
	 */
	public function getName(): string {

		return $this->details['name'];
	}

	/**
	 * Get the product version.
	 *
	 * @return string the product version.
	 */
	public function getVersion(): string {

		return $this->details['version'];
	}

	/**
	 * Get the product type ("plugin" or "theme").
	 *
	 * @return string the product type.
	 */
	public function getType(): string {

		return $this->details['type'];
	}

	/**
	 * Get the product lifecycle status.
	 *
	 * @return string the product status.
	 */
	public function getStatus(): string {

		return $this->details['status'];
	}

	/**
	 * Is the product a companion plugin?
	 *
	 * @return bool true when the product is the companion plugin.
	 */
	public function isCompanion(): bool {

		return $this->details['isCompanion'];
	}

	/**
	 * Get a single detail value with default fallback.
	 *
	 * @param string $key     the detail key (e.g. "homepage", "assets", "meta").
	 * @param mixed  $default the fallback value when the key is missing.
	 *
	 * @return mixed the detail value or fallback.
	 */
	public function getDetail( string $key, $default = null ) {

		return $this->details[ $key ] ?? $default;
	}

	/**
	 * Get all product details as a plain array (localization-ready).
	 *
	 * @return array the product details.
	 */
	public function toArray(): array {

		return $this->details;
	}
}
