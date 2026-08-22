<?php

namespace Blockera\Setup\Tests;

use Blockera\Products\Product;
use Blockera\Products\Registry;

/**
 * Covers the blockera site builder self-registration into the products registry
 * (blockera_sb_get_product_details / blockera_sb_register_product).
 *
 * These tests are environment-aware: the same suite runs where blockera is the
 * standalone plugin (entry under WP_PLUGIN_DIR → companion registered) and where
 * it is embedded in the blockera-one theme (registration skipped).
 */
class SbProductRegistrationTest extends \Blockera\Dev\PHPUnit\AppTestCase {

	public function set_up(): void {

		parent::set_up();

		// Detach lazy registrants so each test controls the registry content.
		// WP_UnitTestCase restores the original hooks in tear_down().
		remove_all_actions( 'blockera/products/registry/init' );

		$this->resetProductsRegistry();
	}

	public function tear_down(): void {

		$this->resetProductsRegistry();

		parent::tear_down();
	}

	/**
	 * Reset the products registry singleton so state never leaks between tests.
	 */
	private function resetProductsRegistry(): void {

		if ( ! class_exists( Registry::class ) ) {

			return;
		}

		$instance = new \ReflectionProperty( Registry::class, 'instance' );
		$instance->setAccessible( true );
		$instance->setValue( null, null );
	}

	/**
	 * Whether the current environment runs blockera as the standalone plugin.
	 */
	private function isStandalonePluginEnv(): bool {

		return defined( 'WP_PLUGIN_DIR' ) && 0 === strpos(
			wp_normalize_path( BLOCKERA_SB_FILE ),
			trailingslashit( wp_normalize_path( WP_PLUGIN_DIR ) )
		);
	}

	public function test_product_details_shape(): void {

		$details = blockera_sb_get_product_details();

		$this->assertSame( 'blockera', $details['slug'] );
		$this->assertSame( 'plugin', $details['type'] );
		$this->assertSame( 'active', $details['status'] );
		$this->assertTrue( $details['isCompanion'] );

		$this->assertNotEmpty( $details['name'] );
		$this->assertNotEmpty( $details['version'] );

		$this->assertArrayHasKey( 'wordpress', $details['requires'] );
		$this->assertArrayHasKey( 'php', $details['requires'] );
	}

	public function test_product_details_create_a_valid_product(): void {

		if ( ! class_exists( Product::class ) ) {

			$this->markTestSkipped( 'blockera/products package is not available.' );
		}

		$this->assertInstanceOf(
			Product::class,
			Product::create( blockera_sb_get_product_details() )
		);
	}

	public function test_register_product_respects_install_location(): void {

		if ( ! function_exists( 'blockera_register_product' ) ) {

			$this->markTestSkipped( 'blockera/products package is not available.' );
		}

		blockera_sb_register_product();

		if ( $this->isStandalonePluginEnv() ) {

			// Standalone plugin: registered as the active companion product.
			$product = blockera_get_product( 'blockera' );

			$this->assertNotNull( $product );
			$this->assertTrue( $product['isCompanion'] );
			$this->assertSame( 'active', $product['status'] );
		} else {

			// Embedded in a theme: no companion product must be registered.
			$this->assertNull( blockera_get_product( 'blockera' ) );
		}
	}

	public function test_registration_is_hooked_on_registry_init(): void {

		// set_up() removed the hooks; re-attach like php/app.php does and verify
		// the lazy registration path end to end via first registry read access.
		if ( ! function_exists( 'blockera_register_product' ) ) {

			$this->markTestSkipped( 'blockera/products package is not available.' );
		}

		add_action( 'blockera/products/registry/init', 'blockera_sb_register_product' );

		$this->assertSame(
			$this->isStandalonePluginEnv(),
			null !== blockera_get_product( 'blockera' )
		);
	}
}
