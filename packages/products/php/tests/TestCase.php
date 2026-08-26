<?php
/**
 * Shared helpers for blockera/products package tests.
 *
 * @package blockera/products
 */

namespace Blockera\Products\Tests;

use Blockera\Dev\PHPUnit\AppTestCase;
use Blockera\Products\Registry;
use ReflectionProperty;

/**
 * Base test case for the products registry package.
 */
abstract class TestCase extends AppTestCase {

	/**
	 * Valid product details fixture matching product-details.schema.json.
	 *
	 * @param array $overrides overrides merged over the defaults.
	 *
	 * @return array the product details.
	 */
	protected function validProductDetails( array $overrides = array() ): array {
		return array_merge(
			array(
				'name'        => 'Blockera Site Builder',
				'slug'        => 'blockera',
				'version'     => '1.12.2',
				'type'        => 'plugin',
				'status'      => 'active',
				'isCompanion' => true,
			),
			$overrides
		);
	}

	/**
	 * Reset the Registry singleton so per-test state never leaks
	 * (Registry stores registered products in a private static instance).
	 *
	 * @return void
	 */
	protected function resetProductsRegistry(): void {
		$property = new ReflectionProperty( Registry::class, 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );
	}

	/**
	 * Reset registry state before each test.
	 *
	 * Consumer products (e.g. the blockera-one theme) hook lazy registrants on
	 * `blockera/products/registry/init`; detach them so package tests assert
	 * against an empty registry. WP_UnitTestCase restores hooks in tear_down.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		remove_all_actions( 'blockera/products/registry/init' );

		$this->resetProductsRegistry();
	}

	/**
	 * Reset registry state after each test.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		$this->resetProductsRegistry();

		parent::tear_down();
	}
}
