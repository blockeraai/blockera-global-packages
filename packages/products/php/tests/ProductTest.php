<?php
/**
 * Unit tests for the Product value object.
 *
 * @package blockera/products
 */

namespace Blockera\Products\Tests;

use Blockera\Products\Product;

/**
 * Covers packages/products/php/Product.php.
 */
class ProductTest extends TestCase {

	/**
	 * Valid details must produce a Product with working getters.
	 *
	 * @return void
	 */
	public function test_create_with_valid_details_returns_product(): void {
		$product = Product::create( $this->validProductDetails() );

		$this->assertInstanceOf( Product::class, $product );
		$this->assertSame( 'blockera', $product->getSlug() );
		$this->assertSame( 'Blockera Site Builder', $product->getName() );
		$this->assertSame( '1.12.2', $product->getVersion() );
		$this->assertSame( 'plugin', $product->getType() );
		$this->assertSame( 'active', $product->getStatus() );
		$this->assertTrue( $product->isCompanion() );
	}

	/**
	 * Each missing required field must reject creation.
	 *
	 * @return void
	 */
	public function test_create_rejects_missing_required_fields(): void {
		foreach ( array( 'name', 'slug', 'version', 'type', 'status', 'isCompanion' ) as $field ) {
			$details = $this->validProductDetails();
			unset( $details[ $field ] );

			$this->assertNull(
				Product::create( $details ),
				"Product::create() must return null when '{$field}' is missing."
			);
		}
	}

	/**
	 * Required string fields with wrong types must reject creation.
	 *
	 * @return void
	 */
	public function test_create_rejects_invalid_field_types(): void {
		$this->assertNull( Product::create( $this->validProductDetails( array( 'name' => 123 ) ) ) );
		$this->assertNull( Product::create( $this->validProductDetails( array( 'slug' => array() ) ) ) );
		$this->assertNull( Product::create( $this->validProductDetails( array( 'isCompanion' => 'yes' ) ) ) );
	}

	/**
	 * Enum fields must only accept schema values.
	 *
	 * @return void
	 */
	public function test_create_rejects_invalid_enum_values(): void {
		$this->assertNull( Product::create( $this->validProductDetails( array( 'type' => 'mu-plugin' ) ) ) );
		$this->assertNull( Product::create( $this->validProductDetails( array( 'status' => 'disabled' ) ) ) );

		// All schema enum values must be accepted.
		foreach ( array( 'plugin', 'theme' ) as $type ) {
			$this->assertInstanceOf( Product::class, Product::create( $this->validProductDetails( array( 'type' => $type ) ) ) );
		}

		foreach ( array( 'active', 'inactive', 'deprecated', 'beta', 'unreleased' ) as $status ) {
			$this->assertInstanceOf( Product::class, Product::create( $this->validProductDetails( array( 'status' => $status ) ) ) );
		}
	}

	/**
	 * Optional details must round-trip through toArray() and getDetail().
	 *
	 * @return void
	 */
	public function test_optional_details_round_trip(): void {
		$details = $this->validProductDetails(
			array(
				'homepage' => 'https://blockera.ai',
				'requires' => array(
					'wordpress' => '6.7',
					'php'       => '7.4',
				),
				'meta'     => array( 'channel' => 'stable' ),
			)
		);

		$product = Product::create( $details );

		$this->assertSame( $details, $product->toArray() );
		$this->assertSame( 'https://blockera.ai', $product->getDetail( 'homepage' ) );
		$this->assertSame( array( 'channel' => 'stable' ), $product->getDetail( 'meta' ) );
		$this->assertSame( 'fallback', $product->getDetail( 'missing-key', 'fallback' ) );
		$this->assertNull( $product->getDetail( 'missing-key' ) );
	}
}
