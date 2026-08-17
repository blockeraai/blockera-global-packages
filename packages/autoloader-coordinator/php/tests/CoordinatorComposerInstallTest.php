<?php
/**
 * Composer install mode (with-dev vs --no-dev) drives autoload policy.
 *
 * @package blockera/autoloader-coordinator
 */

namespace Blockera\SharedAutoload\Tests;

use Blockera\Dev\PHPUnit\AppTestCase;
use Blockera\SharedAutoload\Coordinator;
use ReflectionClass;
use ReflectionProperty;

/**
 * Covers Coordinator policy for composer install vs composer install --no-dev.
 */
class CoordinatorComposerInstallTest extends AppTestCase {

	/**
	 * Fixture product root created for the current test.
	 *
	 * @var string
	 */
	private string $fixture_root = '';

	/**
	 * Remove the fixture tree after each test.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		if ( '' !== $this->fixture_root && is_dir( $this->fixture_root ) ) {
			$this->removeDirectory( $this->fixture_root );
		}

		parent::tear_down();
	}

	/**
	 * `composer install` (root.dev=true) must load require and require-dev packages
	 * even when APP_MODE is production (dotenv is not loaded at autoload time).
	 *
	 * @return void
	 */
	public function test_with_dev_install_loads_require_and_require_dev_packages(): void {
		unset( $_ENV['APP_MODE'], $_SERVER['APP_MODE'] );
		putenv( 'APP_MODE' );

		$fixture     = $this->createComposerFixture( true );
		$coordinator = $this->newCoordinator();
		$policy      = $this->invokeMethod(
			$coordinator,
			'getAutoloadPolicy',
			array( $fixture['vendor_dir'], $fixture['plugin_dir'] )
		);

		$this->assertTrue( $policy['include_dev'] );
		$this->assertFalse( $policy['skip_vendor_dev_filter'] );
		$this->assertArrayHasKey( 'blockera/utils', $policy['allowed_packages'] );
		$this->assertArrayHasKey( 'phpunit/phpunit', $policy['allowed_packages'] );
		$this->assertArrayHasKey( $fixture['helper_path'], $policy['runtime_excluded_files'] );
		$this->assertTrue(
			$this->invokeMethod( $coordinator, 'shouldIncludeDevDependencies', array( $fixture['vendor_dir'] ) )
		);
		$this->assertFalse(
			$this->invokeCanUseNative( $coordinator, $fixture )
		);
	}

	/**
	 * `composer install --no-dev` must load production packages only.
	 *
	 * @return void
	 */
	public function test_no_dev_install_loads_production_packages_only(): void {
		$fixture     = $this->createComposerFixture( false );
		$coordinator = $this->newCoordinator();
		$policy      = $this->invokeMethod(
			$coordinator,
			'getAutoloadPolicy',
			array( $fixture['vendor_dir'], $fixture['plugin_dir'] )
		);

		$this->assertFalse( $policy['include_dev'] );
		$this->assertTrue( $policy['skip_vendor_dev_filter'] );
		$this->assertArrayHasKey( 'blockera/utils', $policy['allowed_packages'] );
		$this->assertArrayNotHasKey( 'phpunit/phpunit', $policy['allowed_packages'] );
		$this->assertSame( array(), $policy['runtime_excluded_files'] );
		$this->assertFalse(
			$this->invokeMethod( $coordinator, 'shouldIncludeDevDependencies', array( $fixture['vendor_dir'] ) )
		);
		$this->assertTrue(
			$this->invokeCanUseNative( $coordinator, $fixture )
		);
	}

	/**
	 * Isolated Coordinator that does not replace the process singleton.
	 *
	 * @return Coordinator
	 */
	private function newCoordinator(): Coordinator {
		$reflection = new ReflectionClass( Coordinator::class );

		/** @var Coordinator $coordinator */
		$coordinator = $reflection->newInstanceWithoutConstructor();

		$descriptors = new ReflectionProperty( Coordinator::class, 'product_descriptors' );
		$descriptors->setAccessible( true );
		$descriptors->setValue( $coordinator, array() );

		$plugins = new ReflectionProperty( Coordinator::class, 'plugins' );
		$plugins->setAccessible( true );
		$plugins->setValue( $coordinator, array() );

		$installed = new ReflectionProperty( Coordinator::class, 'installed_packages_context_by_vendor' );
		$installed->setAccessible( true );
		$installed->setValue( $coordinator, array() );

		$include_dev = new ReflectionProperty( Coordinator::class, 'include_dev_dependencies_by_vendor' );
		$include_dev->setAccessible( true );
		$include_dev->setValue( $coordinator, array() );

		$policy = new ReflectionProperty( Coordinator::class, 'autoload_policy_by_key' );
		$policy->setAccessible( true );
		$policy->setValue( $coordinator, array() );

		return $coordinator;
	}

	/**
	 * Invoke canUseNativeComposerAutoload with a single registered fixture product.
	 *
	 * @param Coordinator $coordinator Coordinator under test.
	 * @param array       $fixture     Fixture paths.
	 */
	private function invokeCanUseNative( Coordinator $coordinator, array $fixture ): bool {
		$plugins = new ReflectionProperty( Coordinator::class, 'plugins' );
		$plugins->setAccessible( true );
		$plugins->setValue(
			$coordinator,
			array(
				'blockera-one' => array(
					'slug'       => 'blockera-one',
					'plugin_dir' => $fixture['plugin_dir'],
					'vendor_dir' => $fixture['vendor_dir'],
					'priority'   => 10,
					'default'    => true,
					'type'       => 'theme',
				),
			)
		);

		return (bool) $this->invokeMethod( $coordinator, 'canUseNativeComposerAutoload' );
	}

	/**
	 * Build a mini product tree with Composer installed.php metadata.
	 *
	 * @param bool $include_dev Whether installed.php root.dev is true.
	 * @return array{plugin_dir:string,vendor_dir:string,helper_path:string}
	 */
	private function createComposerFixture( bool $include_dev ): array {
		$this->fixture_root = sys_get_temp_dir() . '/blockera-autoload-' . uniqid( '', true );
		$plugin_dir         = $this->fixture_root;
		$vendor_dir         = $plugin_dir . '/vendor';
		$composer_dir       = $vendor_dir . '/composer';
		$helper_rel         = 'tests/phpunit/helpers.php';
		$helper_path        = $plugin_dir . '/' . $helper_rel;

		mkdir( $composer_dir, 0777, true );
		mkdir( dirname( $helper_path ), 0777, true );
		mkdir( $vendor_dir . '/blockera/utils', 0777, true );

		file_put_contents( $vendor_dir . '/autoload.php', "<?php\n" );
		file_put_contents( $composer_dir . '/autoload_psr4.php', "<?php\nreturn [];\n" );
		file_put_contents( $helper_path, "<?php\n" );
		file_put_contents(
			$plugin_dir . '/composer.json',
			wp_json_encode(
				array(
					'name'         => 'blockera/theme',
					'autoload-dev' => array(
						'files' => array( $helper_rel ),
					),
				)
			)
		);

		$versions = array(
			'blockera/utils' => array(
				'dev_requirement' => false,
				'install_path'    => $vendor_dir . '/blockera/utils',
			),
		);

		if ( $include_dev ) {
			mkdir( $vendor_dir . '/phpunit/phpunit', 0777, true );
			$versions['phpunit/phpunit'] = array(
				'dev_requirement' => true,
				'install_path'    => $vendor_dir . '/phpunit/phpunit',
			);
		}

		$installed = var_export(
			array(
				'root'     => array(
					'name' => 'blockera/theme',
					'dev'  => $include_dev,
				),
				'versions' => $versions,
			),
			true
		);
		file_put_contents( $composer_dir . '/installed.php', "<?php\nreturn {$installed};\n" );

		$realpath_helper = realpath( $helper_path );

		return array(
			'plugin_dir'  => $plugin_dir,
			'vendor_dir'  => $vendor_dir,
			'helper_path' => ( false !== $realpath_helper ) ? $realpath_helper : $helper_path,
		);
	}

	/**
	 * Recursively delete a directory tree.
	 *
	 * @param string $directory Directory path.
	 */
	private function removeDirectory( string $directory ): void {
		$items = scandir( $directory );

		if ( false === $items ) {
			return;
		}

		foreach ( $items as $item ) {
			if ( '.' === $item || '..' === $item ) {
				continue;
			}

			$path = $directory . '/' . $item;

			if ( is_dir( $path ) ) {
				$this->removeDirectory( $path );
				continue;
			}

			unlink( $path );
		}

		rmdir( $directory );
	}
}
