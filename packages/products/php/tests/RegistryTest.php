<?php
/**
 * Unit tests for the products Registry object store api.
 *
 * @package blockera/products
 */

namespace Blockera\Products\Tests;

use Blockera\Products\Product;
use Blockera\Products\Registry;

/**
 * Covers packages/products/php/Registry.php.
 */
class RegistryTest extends TestCase {

	/**
	 * getInstance() must always return the same shared instance.
	 *
	 * @return void
	 */
	public function test_get_instance_is_singleton(): void {
		$this->assertSame( Registry::getInstance(), Registry::getInstance() );
	}

	/**
	 * Register accepts raw arrays and Product instances.
	 *
	 * @return void
	 */
	public function test_register_accepts_array_and_product_instance(): void {
		$registry = Registry::getInstance();

		$from_array = $registry->register( $this->validProductDetails() );
		$this->assertInstanceOf( Product::class, $from_array );

		$instance = Product::create( $this->validProductDetails( array( 'slug' => 'blockera-pro' ) ) );
		$this->assertSame( $instance, $registry->register( $instance ) );

		$this->assertTrue( $registry->has( 'blockera' ) );
		$this->assertTrue( $registry->has( 'blockera-pro' ) );
		$this->assertCount( 2, $registry->all() );
	}

	/**
	 * Invalid details must not be stored.
	 *
	 * @return void
	 */
	public function test_register_rejects_invalid_details(): void {
		$registry = Registry::getInstance();

		$this->assertNull( $registry->register( array( 'slug' => 'broken' ) ) );
		$this->assertFalse( $registry->has( 'broken' ) );
	}

	/**
	 * Registering the same slug again must overwrite the previous entry.
	 *
	 * @return void
	 */
	public function test_register_same_slug_overwrites(): void {
		$registry = Registry::getInstance();

		$registry->register( $this->validProductDetails( array( 'version' => '1.0.0' ) ) );
		$registry->register( $this->validProductDetails( array( 'version' => '2.0.0' ) ) );

		$this->assertCount( 1, $registry->all() );
		$this->assertSame( '2.0.0', $registry->get( 'blockera' )->getVersion() );
	}

	/**
	 * get() returns null for unknown slugs; deregister() removes entries.
	 *
	 * @return void
	 */
	public function test_get_and_deregister(): void {
		$registry = Registry::getInstance();

		$this->assertNull( $registry->get( 'unknown' ) );
		$this->assertFalse( $registry->deregister( 'unknown' ) );

		$registry->register( $this->validProductDetails() );

		$this->assertTrue( $registry->deregister( 'blockera' ) );
		$this->assertFalse( $registry->has( 'blockera' ) );
		$this->assertSame( array(), $registry->all() );
	}

	/**
	 * toArray() returns localization-ready plain arrays keyed by slug.
	 *
	 * @return void
	 */
	public function test_to_array_returns_details_keyed_by_slug(): void {
		$details  = $this->validProductDetails();
		$registry = Registry::getInstance();
		$registry->register( $details );

		$this->assertSame( array( 'blockera' => $details ), $registry->toArray() );
	}

	/**
	 * The init action must fire exactly once, on first read access,
	 * and lazy registrants must be included in read results.
	 *
	 * @return void
	 */
	public function test_init_action_fires_once_on_first_read_access(): void {
		$calls   = 0;
		$details = $this->validProductDetails( array( 'slug' => 'blockera-one', 'type' => 'theme', 'isCompanion' => false ) );

		$registrant = function ( Registry $registry ) use ( &$calls, $details ): void {
			++$calls;
			$registry->register( $details );
		};

		add_action( 'blockera/products/registry/init', $registrant );

		try {
			$registry = Registry::getInstance();

			// Not fired before any read access.
			$this->assertSame( 0, $calls );

			// First read fires the action; the lazy registrant is visible in results.
			$this->assertTrue( $registry->has( 'blockera-one' ) );
			$this->assertSame( 1, $calls );

			// Further reads must not re-fire it.
			$registry->all();
			$registry->get( 'blockera-one' );
			$registry->toArray();
			$this->assertSame( 1, $calls );
		} finally {
			remove_action( 'blockera/products/registry/init', $registrant );
		}
	}

	/**
	 * boot() must fire the init action once, same as first read access.
	 *
	 * @return void
	 */
	public function test_boot_fires_init_action_once(): void {
		$calls = 0;

		$registrant = static function () use ( &$calls ): void {
			++$calls;
		};

		add_action( 'blockera/products/registry/init', $registrant );

		try {
			$registry = Registry::getInstance();

			$this->assertSame( 0, $calls );

			$registry->boot();
			$this->assertSame( 1, $calls );

			$registry->boot();
			$registry->all();
			$this->assertSame( 1, $calls );
		} finally {
			remove_action( 'blockera/products/registry/init', $registrant );
		}
	}
}
