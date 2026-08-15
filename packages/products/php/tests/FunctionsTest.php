<?php
/**
 * Integration tests for the products public api and localization.
 *
 * @package blockera/products
 */

namespace Blockera\Products\Tests;

use Blockera\Products\Product;
use Blockera\Products\Registry;

/**
 * Covers packages/products/php/functions.php and php/hooks.php.
 */
class FunctionsTest extends TestCase {

	/**
	 * The script handle localized by blockera_products_l10n().
	 */
	private const SCRIPT_HANDLE = '@blockera/products';

	/**
	 * Clean the products script handle between tests.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		wp_scripts()->remove( self::SCRIPT_HANDLE );

		parent::tear_down();
	}

	/**
	 * Public helpers must round-trip register/get/deregister.
	 *
	 * @return void
	 */
	public function test_public_api_round_trip(): void {
		$details = $this->validProductDetails();

		$this->assertSame( Registry::getInstance(), blockera_products_registry() );

		$this->assertInstanceOf( Product::class, blockera_register_product( $details ) );
		$this->assertSame( $details, blockera_get_product( 'blockera' ) );
		$this->assertSame( array( 'blockera' => $details ), blockera_get_products() );

		$this->assertTrue( blockera_deregister_product( 'blockera' ) );
		$this->assertNull( blockera_get_product( 'blockera' ) );
		$this->assertSame( array(), blockera_get_products() );
	}

	/**
	 * Invalid details must be rejected by the public api too.
	 *
	 * @return void
	 */
	public function test_public_api_rejects_invalid_details(): void {
		$this->assertNull( blockera_register_product( array( 'name' => 'No slug' ) ) );
		$this->assertSame( array(), blockera_get_products() );
	}

	/**
	 * The localize payload must expose registered products and be filterable.
	 *
	 * @return void
	 */
	public function test_localize_payload_is_filterable(): void {
		$details = $this->validProductDetails();
		blockera_register_product( $details );

		$this->assertSame( array( 'products' => array( 'blockera' => $details ) ), blockera_products_localize() );

		$filter = static function ( array $payload ): array {
			$payload['extra'] = true;

			return $payload;
		};

		add_filter( 'blockera/products/localize', $filter );

		try {
			$payload = blockera_products_localize();

			$this->assertTrue( $payload['extra'] );
			$this->assertSame( array( 'blockera' => $details ), $payload['products'] );
		} finally {
			remove_filter( 'blockera/products/localize', $filter );
		}
	}

	/**
	 * The l10n hook must be registered by php/hooks.php.
	 *
	 * Composer autoloads hooks.php before WordPress in the test bootstrap
	 * (its add_action guard skips), so re-run it here the way real consumers
	 * load it — after WordPress booted. String callbacks are idempotent.
	 *
	 * @return void
	 */
	public function test_l10n_hook_is_registered(): void {
		require dirname( __DIR__ ) . '/hooks.php';

		$this->assertSame( 100, has_action( 'admin_enqueue_scripts', 'blockera_products_l10n' ) );
	}

	/**
	 * blockera_products_l10n() must attach the payload once, only when
	 * the products script handle is registered.
	 *
	 * Single test method because the function keeps a per-request static guard.
	 *
	 * @return void
	 */
	public function test_l10n_attaches_inline_script_once(): void {
		blockera_register_product( $this->validProductDetails() );

		// Handle not registered yet: no inline script and the guard stays open.
		blockera_products_l10n();
		$this->assertFalse( wp_scripts()->get_data( self::SCRIPT_HANDLE, 'before' ) );

		wp_register_script( self::SCRIPT_HANDLE, false, array(), '1.0.0', true );

		blockera_products_l10n();

		$before = wp_scripts()->get_data( self::SCRIPT_HANDLE, 'before' );
		$inline = implode( '', array_filter( (array) $before, 'is_string' ) );

		$this->assertStringContainsString( 'var blockeraProductsData = ', $inline );
		$this->assertStringContainsString( '"slug":"blockera"', $inline );

		// A second call must not duplicate the payload (static guard).
		blockera_products_l10n();
		$this->assertSame( $before, wp_scripts()->get_data( self::SCRIPT_HANDLE, 'before' ) );
	}
}
