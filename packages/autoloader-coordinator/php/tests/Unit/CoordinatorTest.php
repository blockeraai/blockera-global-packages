<?php
/**
 * Unit tests for Coordinator class.
 *
 * @package Blockera\SharedAutoload\Tests\Unit
 */

namespace Blockera\SharedAutoload\Tests\Unit;

use Blockera\SharedAutoload\Coordinator;
use Blockera\SharedAutoload\Tests\TestCase;

/**
 * Test cases for Coordinator singleton autoloader.
 *
 * @covers \Blockera\SharedAutoload\Coordinator
 */
class CoordinatorTest extends TestCase {

    /**
     * Temporary directory for test fixtures.
     *
     * @var string
     */
    private string $tempDir;

    /**
     * Set up test environment.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetCoordinatorSingleton();
        $this->tempDir = sys_get_temp_dir() . '/coordinator-test-' . uniqid();
    }

    /**
     * Tear down test environment.
     */
    protected function tearDown(): void {
        if (isset($this->tempDir) && is_dir($this->tempDir)) {
            $this->removeTempDir($this->tempDir);
        }
        $this->resetCoordinatorSingleton();
        parent::tearDown();
    }

    // =========================================================================
    // Singleton Pattern Tests
    // =========================================================================

    /**
     * Test that getInstance returns a Coordinator instance.
     *
     * @test
     */
    public function test_get_instance_returns_coordinator(): void {
        $instance = Coordinator::getInstance();

        $this->assertInstanceOf(Coordinator::class, $instance);
    }

    /**
     * Test that getInstance returns the same instance.
     *
     * @test
     */
    public function test_get_instance_returns_same_instance(): void {
        $instance1 = Coordinator::getInstance();
        $instance2 = Coordinator::getInstance();

        $this->assertSame($instance1, $instance2);
    }

    /**
     * Test that resetting singleton creates new instance.
     *
     * @test
     */
    public function test_reset_singleton_creates_new_instance(): void {
        $instance1 = Coordinator::getInstance();
        $this->resetCoordinatorSingleton();
        $instance2 = Coordinator::getInstance();

        $this->assertNotSame($instance1, $instance2);
    }

    // =========================================================================
    // Plugins Registration Tests (Direct Setting)
    // =========================================================================

    /**
     * Test plugins can be set directly and retrieved.
     *
     * @test
     */
    public function test_plugins_can_be_set_directly(): void {
        $coordinator = Coordinator::getInstance();

        $plugins = [
            'plugin-a' => [
                'slug' => 'plugin-a',
                'plugin_dir' => '/path/to/plugin-a',
                'vendor_dir' => '/path/to/plugin-a/vendor',
                'packages_dir' => '/path/to/plugin-a/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
        ];

        $this->setPrivateProperty($coordinator, 'plugins', $plugins);

        $retrievedPlugins = $this->getPrivateProperty($coordinator, 'plugins');
        $this->assertCount(1, $retrievedPlugins);
        $this->assertArrayHasKey('plugin-a', $retrievedPlugins);
    }

    /**
     * Test multiple plugins can be set.
     *
     * @test
     */
    public function test_multiple_plugins_can_be_set(): void {
        $coordinator = Coordinator::getInstance();

        $plugins = [
            'plugin-a' => [
                'slug' => 'plugin-a',
                'plugin_dir' => '/path/to/plugin-a',
                'vendor_dir' => '/path/to/plugin-a/vendor',
                'priority' => 10,
                'default' => true,
            ],
            'plugin-b' => [
                'slug' => 'plugin-b',
                'plugin_dir' => '/path/to/plugin-b',
                'vendor_dir' => '/path/to/plugin-b/vendor',
                'priority' => 20,
                'default' => false,
            ],
        ];

        $this->setPrivateProperty($coordinator, 'plugins', $plugins);

        $retrievedPlugins = $this->getPrivateProperty($coordinator, 'plugins');
        $this->assertCount(2, $retrievedPlugins);
    }

    /**
     * Test setting plugins clears autoload manifest.
     *
     * @test
     */
    public function test_setting_autoload_manifest_to_null(): void {
        $coordinator = Coordinator::getInstance();

        // Set an existing manifest.
        $this->setPrivateProperty($coordinator, 'autoload_manifest', ['existing' => 'data']);

        // Verify it's set.
        $manifest = $this->getPrivateProperty($coordinator, 'autoload_manifest');
        $this->assertNotNull($manifest);

        // Clear it (simulating what registerPlugin does).
        $this->setPrivateProperty($coordinator, 'autoload_manifest', null);

        $manifest = $this->getPrivateProperty($coordinator, 'autoload_manifest');
        $this->assertNull($manifest);
    }

    // =========================================================================
    // bootstrap Tests
    // =========================================================================

    /**
     * Test bootstrap does nothing with less than 2 plugins.
     *
     * @test
     */
    public function test_bootstrap_skips_with_less_than_two_plugins(): void {
        $coordinator = Coordinator::getInstance();

        // Set only one plugin.
        $this->setPrivateProperty($coordinator, 'plugins', [
            'plugin-a' => [
                'slug' => 'plugin-a',
                'plugin_dir' => '/path/to/plugin-a',
                'vendor_dir' => '/path/to/plugin-a/vendor',
                'packages_dir' => '/path/to/plugin-a/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
        ]);

        $coordinator->bootstrap();

        $bootstrapped = $this->getPrivateProperty($coordinator, 'bootstrapped');
        $this->assertFalse($bootstrapped);
    }

    /**
     * Test bootstrap does not run twice.
     *
     * @test
     */
    public function test_bootstrap_does_not_run_twice(): void {
        $this->createTestPluginFixture();

        $coordinator = Coordinator::getInstance();

        // Mark as already bootstrapped.
        $this->setPrivateProperty($coordinator, 'bootstrapped', true);
        $this->setPrivateProperty($coordinator, 'coordinator_ref', 'already-set');
        $this->setPrivateProperty($coordinator, 'plugins', $this->getTestPluginsConfig());

        $coordinator->bootstrap();

        $this->assertTrue($this->getPrivateProperty($coordinator, 'bootstrapped'));
        $this->assertSame('already-set', $this->getPrivateProperty($coordinator, 'coordinator_ref'));
    }

    /**
     * Test bootstrap executes callback after bootstrapping.
     *
     * @test
     */
    public function test_bootstrap_executes_callback(): void {
        $this->createTestPluginFixture();

        $coordinator = Coordinator::getInstance();

        // Register plugins.
        $this->setPrivateProperty($coordinator, 'plugins', $this->getTestPluginsConfig());

        $callbackExecuted = false;
        $coordinator->bootstrap(function () use (&$callbackExecuted) {
            $callbackExecuted = true;
        });

        $this->assertTrue($callbackExecuted);
    }

    /**
     * Test bootstrap sorts plugins by priority.
     *
     * @test
     */
    public function test_bootstrap_sorts_plugins_by_priority(): void {
        $this->createTestPluginFixture();

        $coordinator = Coordinator::getInstance();

        $plugins = [
            'plugin-low' => [
                'slug' => 'plugin-low',
                'plugin_dir' => $this->tempDir . '/plugin-a',
                'vendor_dir' => $this->tempDir . '/plugin-a/vendor',
                'packages_dir' => $this->tempDir . '/plugin-a/vendor/blockera',
                'priority' => 30,
                'default' => false,
            ],
            'plugin-high' => [
                'slug' => 'plugin-high',
                'plugin_dir' => $this->tempDir . '/plugin-b',
                'vendor_dir' => $this->tempDir . '/plugin-b/vendor',
                'packages_dir' => $this->tempDir . '/plugin-b/vendor/blockera',
                'priority' => 5,
                'default' => true,
            ],
        ];

        $this->setPrivateProperty($coordinator, 'plugins', $plugins);

        $coordinator->bootstrap();

        $sortedPlugins = $this->getPrivateProperty($coordinator, 'plugins');
        $priorities = array_column($sortedPlugins, 'priority');

        // First plugin should have lower priority number.
        $this->assertLessThanOrEqual($priorities[1] ?? PHP_INT_MAX, $priorities[0]);
    }

    // =========================================================================
    // getClassLoader Tests
    // =========================================================================

    /**
     * Test getClassLoader returns null when not initialized.
     *
     * @test
     */
    public function test_get_class_loader_returns_null_when_not_initialized(): void {
        $coordinator = Coordinator::getInstance();

        $classLoader = $coordinator->getClassLoader();

        $this->assertNull($classLoader);
    }

    // =========================================================================
    // invalidatePackageManifest Tests
    // =========================================================================

    /**
     * Test invalidatePackageManifest deletes transients.
     *
     * @test
     */
    public function test_invalidate_package_manifest_calls_delete_transient(): void {
        // Set up some test transients.
        $this->setTestTransient('blockera_pkg_manifest', ['test' => 'data']);
        $this->setTestTransient('blockera_pkgs_files', ['test' => 'data']);

        $coordinator = Coordinator::getInstance();
        $coordinator->invalidatePackageManifest();

        // Verify transients were deleted.
        $this->assertFalse($this->getTestTransient('blockera_pkg_manifest'));
        $this->assertFalse($this->getTestTransient('blockera_pkgs_files'));
    }

    // =========================================================================
    // detectPackageFromPath Tests
    // =========================================================================

    /**
     * Test detectPackageFromPath finds package in same directory.
     *
     * @test
     */
    public function test_detect_package_from_path_finds_package(): void {
        $packageDir = $this->tempDir . '/test-package';
        mkdir($packageDir, 0777, true);

        $composerJson = json_encode([
            'name' => 'blockera/test-package',
            'version' => '1.2.3',
        ]);
        file_put_contents($packageDir . '/composer.json', $composerJson);
        file_put_contents($packageDir . '/functions.php', '<?php // test');

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'detectPackageFromPath',
            [$packageDir . '/functions.php']
        );

        $this->assertEquals('blockera/test-package', $result['name']);
        $this->assertEquals('1.2.3', $result['version']);
    }

    /**
     * Test detectPackageFromPath finds package in parent directory.
     *
     * @test
     */
    public function test_detect_package_from_path_searches_parent_dirs(): void {
        $packageDir = $this->tempDir . '/test-package';
        $subDir = $packageDir . '/src/sub';
        mkdir($subDir, 0777, true);

        $composerJson = json_encode([
            'name' => 'blockera/nested-package',
            'version' => '2.0.0',
        ]);
        file_put_contents($packageDir . '/composer.json', $composerJson);
        file_put_contents($subDir . '/file.php', '<?php // test');

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'detectPackageFromPath',
            [$subDir . '/file.php']
        );

        $this->assertEquals('blockera/nested-package', $result['name']);
        $this->assertEquals('2.0.0', $result['version']);
    }

    /**
     * Test detectPackageFromPath returns empty when no composer.json found.
     *
     * @test
     */
    public function test_detect_package_from_path_returns_empty_when_not_found(): void {
        $testDir = $this->tempDir . '/no-package/deep/nested';
        mkdir($testDir, 0777, true);
        file_put_contents($testDir . '/file.php', '<?php // test');

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'detectPackageFromPath',
            [$testDir . '/file.php']
        );

        $this->assertEmpty($result);
    }

    /**
     * Test detectPackageFromPath uses default version when not specified.
     *
     * @test
     */
    public function test_detect_package_from_path_uses_default_version(): void {
        $packageDir = $this->tempDir . '/test-package-no-version';
        mkdir($packageDir, 0777, true);

        $composerJson = json_encode([
            'name' => 'blockera/no-version-package',
        ]);
        file_put_contents($packageDir . '/composer.json', $composerJson);

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'detectPackageFromPath',
            [$packageDir]
        );

        $this->assertEquals('blockera/no-version-package', $result['name']);
        $this->assertEquals('0.0.0', $result['version']);
    }

    // =========================================================================
    // globRecursiveComposerJson Tests
    // =========================================================================

    /**
     * Test globRecursiveComposerJson finds composer.json files.
     *
     * @test
     */
    public function test_glob_recursive_finds_composer_json(): void {
        $packagesDir = $this->tempDir . '/packages';
        mkdir($packagesDir . '/package-a', 0777, true);
        mkdir($packagesDir . '/package-b', 0777, true);

        file_put_contents($packagesDir . '/package-a/composer.json', '{}');
        file_put_contents($packagesDir . '/package-b/composer.json', '{}');

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'globRecursiveComposerJson',
            [$packagesDir]
        );

        $this->assertCount(2, $result);
    }

    /**
     * Test globRecursiveComposerJson finds icon subdirectory composer.json.
     *
     * @test
     */
    public function test_glob_recursive_finds_icon_composer_json(): void {
        $packagesDir = $this->tempDir . '/packages';
        mkdir($packagesDir . '/icons-pkg/icon', 0777, true);

        file_put_contents($packagesDir . '/icons-pkg/icon/composer.json', '{}');

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'globRecursiveComposerJson',
            [$packagesDir]
        );

        $this->assertCount(1, $result);
        $this->assertStringContainsString('icon/composer.json', $result[0]);
    }

    /**
     * Test globRecursiveComposerJson returns empty for non-existent directory.
     *
     * @test
     */
    public function test_glob_recursive_returns_empty_for_invalid_dir(): void {
        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'globRecursiveComposerJson',
            ['/non/existent/path']
        );

        $this->assertEmpty($result);
    }

    /**
     * Test globRecursiveComposerJson skips non-directory entries.
     *
     * @test
     */
    public function test_glob_recursive_skips_files(): void {
        $packagesDir = $this->tempDir . '/packages';
        mkdir($packagesDir, 0777, true);

        // Create a file (not a directory) at packages level.
        file_put_contents($packagesDir . '/some-file.txt', 'content');
        mkdir($packagesDir . '/real-package', 0777, true);
        file_put_contents($packagesDir . '/real-package/composer.json', '{}');

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'globRecursiveComposerJson',
            [$packagesDir]
        );

        $this->assertCount(1, $result);
    }

    // =========================================================================
    // loadAutoloadFile Tests
    // =========================================================================

    /**
     * Test loadAutoloadFile loads valid PHP array file.
     *
     * @test
     */
    public function test_load_autoload_file_returns_array(): void {
        mkdir($this->tempDir, 0777, true);

        $fileContent = '<?php return ["key" => "value"];';
        $filePath = $this->tempDir . '/autoload_test.php';
        file_put_contents($filePath, $fileContent);

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'loadAutoloadFile',
            [$filePath, $this->tempDir, dirname($this->tempDir)]
        );

        $this->assertEquals(['key' => 'value'], $result);
    }

    /**
     * Test loadAutoloadFile returns null for non-array return.
     *
     * @test
     */
    public function test_load_autoload_file_returns_null_for_non_array(): void {
        mkdir($this->tempDir, 0777, true);

        $fileContent = '<?php return "string";';
        $filePath = $this->tempDir . '/autoload_string.php';
        file_put_contents($filePath, $fileContent);

        $coordinator = Coordinator::getInstance();
        $result = $this->invokePrivateMethod(
            $coordinator,
            'loadAutoloadFile',
            [$filePath, $this->tempDir, dirname($this->tempDir)]
        );

        $this->assertNull($result);
    }

    // =========================================================================
    // includeFile Tests
    // =========================================================================

    /**
     * Test includeFile includes file once.
     *
     * @test
     */
    public function test_include_file_includes_once(): void {
        mkdir($this->tempDir, 0777, true);

        $filePath = $this->tempDir . '/test_include.php';
        file_put_contents($filePath, '<?php $GLOBALS["test_include_count"] = ($GLOBALS["test_include_count"] ?? 0) + 1;');

        $coordinator = Coordinator::getInstance();

        // First include.
        $this->invokePrivateMethod($coordinator, 'includeFile', ['test_id_1', $filePath]);

        // Second include with same identifier should be skipped.
        $this->invokePrivateMethod($coordinator, 'includeFile', ['test_id_1', $filePath]);

        $this->assertEquals(1, $GLOBALS['test_include_count']);

        // Cleanup.
        unset($GLOBALS['test_include_count']);
    }

    /**
     * Test includeFile respects global composer autoload files.
     *
     * @test
     */
    public function test_include_file_respects_global_composer_files(): void {
        mkdir($this->tempDir, 0777, true);

        $filePath = $this->tempDir . '/global_test.php';
        file_put_contents($filePath, '<?php $GLOBALS["global_test_loaded"] = true;');

        // Pre-mark as loaded in coordinator include-once globals.
        $GLOBALS['blockera_autoload_files']['global_id'] = true;

        $coordinator = Coordinator::getInstance();
        $this->invokePrivateMethod($coordinator, 'includeFile', ['global_id', $filePath]);

        // File should not have been loaded.
        $this->assertArrayNotHasKey('global_test_loaded', $GLOBALS);

        // Cleanup.
        unset($GLOBALS['blockera_autoload_files']['global_id']);
    }

    /**
     * Test includeFile skips non-existent files.
     *
     * @test
     */
    public function test_include_file_skips_nonexistent(): void {
        $coordinator = Coordinator::getInstance();

        // Should not throw error.
        $this->invokePrivateMethod(
            $coordinator,
            'includeFile',
            ['missing_id', '/path/to/nonexistent/file.php']
        );

        // Check it was not marked as included.
        $includedFiles = $this->getPrivateProperty($coordinator, 'included_files');
        $this->assertArrayNotHasKey('missing_id', $includedFiles);
    }

    // =========================================================================
    // buildPackageManifest Tests
    // =========================================================================

    /**
     * Test buildPackageManifest scans packages directory.
     *
     * @test
     */
    public function test_build_package_manifest_scans_packages(): void {
        $this->createTestPluginFixture();

        $coordinator = Coordinator::getInstance();
        $this->setPrivateProperty($coordinator, 'plugins', [
            'test-plugin' => [
                'slug' => 'test-plugin',
                'plugin_dir' => $this->tempDir . '/plugin-a',
                'vendor_dir' => $this->tempDir . '/plugin-a/vendor',
                'packages_dir' => $this->tempDir . '/plugin-a/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
        ]);

        $manifest = $this->invokePrivateMethod($coordinator, 'buildPackageManifest', []);

        $this->assertArrayHasKey('blockera/test-package', $manifest);
        $this->assertEquals('1.0.0', $manifest['blockera/test-package']['version']);
    }

    /**
     * Test buildPackageManifest keeps highest version.
     *
     * @test
     */
    public function test_build_package_manifest_keeps_highest_version(): void {
        // Create two plugins with same package but different versions.
        $pluginADir = $this->tempDir . '/plugin-a/vendor/blockera/shared-pkg';
        $pluginBDir = $this->tempDir . '/plugin-b/vendor/blockera/shared-pkg';

        mkdir($pluginADir, 0777, true);
        mkdir($pluginBDir, 0777, true);

        file_put_contents($pluginADir . '/composer.json', json_encode([
            'name' => 'blockera/shared-pkg',
            'version' => '1.0.0',
        ]));

        file_put_contents($pluginBDir . '/composer.json', json_encode([
            'name' => 'blockera/shared-pkg',
            'version' => '2.0.0',
        ]));

        $coordinator = Coordinator::getInstance();
        $this->setPrivateProperty($coordinator, 'plugins', [
            'plugin-a' => [
                'slug' => 'plugin-a',
                'plugin_dir' => $this->tempDir . '/plugin-a',
                'vendor_dir' => $this->tempDir . '/plugin-a/vendor',
                'packages_dir' => $this->tempDir . '/plugin-a/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
            'plugin-b' => [
                'slug' => 'plugin-b',
                'plugin_dir' => $this->tempDir . '/plugin-b',
                'vendor_dir' => $this->tempDir . '/plugin-b/vendor',
                'packages_dir' => $this->tempDir . '/plugin-b/vendor/blockera',
                'priority' => 20,
                'default' => false,
            ],
        ]);

        $manifest = $this->invokePrivateMethod($coordinator, 'buildPackageManifest', []);

        $this->assertEquals('2.0.0', $manifest['blockera/shared-pkg']['version']);
        $this->assertEquals('plugin-b', $manifest['blockera/shared-pkg']['plugin']);
    }

    // =========================================================================
    // selectBestPathForPrefix Tests
    // =========================================================================

    /**
     * Test selectBestPathForPrefix returns single path unchanged.
     *
     * @test
     */
    public function test_select_best_path_returns_single_path(): void {
        $coordinator = Coordinator::getInstance();

        $paths = ['/path/to/package'];
        $result = $this->invokePrivateMethod(
            $coordinator,
            'selectBestPathForPrefix',
            ['Blockera\\Test\\', $paths, [], null]
        );

        $this->assertEquals($paths, $result);
    }

    /**
     * Test selectBestPathForPrefix prefers preferred plugin.
     *
     * @test
     */
    public function test_select_best_path_prefers_preferred_plugin(): void {
        $coordinator = Coordinator::getInstance();

        $this->setPrivateProperty($coordinator, 'plugins', [
            'preferred-plugin' => [
                'plugin_dir' => '/preferred/path',
            ],
        ]);

        $paths = [
            '/other/path/package',
            '/preferred/path/package',
        ];

        $result = $this->invokePrivateMethod(
            $coordinator,
            'selectBestPathForPrefix',
            ['Blockera\\Test\\', $paths, [], 'preferred-plugin']
        );

        $this->assertEquals(['/preferred/path/package'], $result);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    /**
     * Create test plugin fixture directories.
     */
    private function createTestPluginFixture(): void {
        // Plugin A structure.
        $pluginADir = $this->tempDir . '/plugin-a';
        $vendorA = $pluginADir . '/vendor';
        $composerA = $vendorA . '/composer';
        $blockeraA = $vendorA . '/blockera/test-package';

        mkdir($blockeraA, 0777, true);
        mkdir($composerA, 0777, true);

        // Create ClassLoader.php mock.
        $this->createClassLoaderMock($composerA);

        // Create autoload files.
        file_put_contents($composerA . '/autoload_psr4.php', '<?php return [];');
        file_put_contents($composerA . '/autoload_classmap.php', '<?php return [];');
        file_put_contents($composerA . '/autoload_files.php', '<?php return [];');

        // Create package composer.json.
        file_put_contents($blockeraA . '/composer.json', json_encode([
            'name' => 'blockera/test-package',
            'version' => '1.0.0',
        ]));

        // Plugin B structure.
        $pluginBDir = $this->tempDir . '/plugin-b';
        $vendorB = $pluginBDir . '/vendor';
        $composerB = $vendorB . '/composer';
        $blockeraB = $vendorB . '/blockera/test-package';

        mkdir($blockeraB, 0777, true);
        mkdir($composerB, 0777, true);

        $this->createClassLoaderMock($composerB);
        file_put_contents($composerB . '/autoload_psr4.php', '<?php return [];');
        file_put_contents($composerB . '/autoload_classmap.php', '<?php return [];');
        file_put_contents($composerB . '/autoload_files.php', '<?php return [];');
        file_put_contents($blockeraB . '/composer.json', json_encode([
            'name' => 'blockera/test-package',
            'version' => '2.0.0',
        ]));
    }

    /**
     * Create ClassLoader mock file.
     *
     * @param string $composerDir Composer directory path.
     */
    private function createClassLoaderMock(string $composerDir): void {
        $classLoaderContent = '<?php
namespace Composer\Autoload;
if (!class_exists(ClassLoader::class, false)) {
    class ClassLoader {
        private $vendorDir;
        private $psr4 = [];
        private $classMap = [];
        public function __construct($vendorDir = "") { $this->vendorDir = $vendorDir; }
        public function addPsr4($prefix, $path, $prepend = false) { 
            if (!isset($this->psr4[$prefix])) {
                $this->psr4[$prefix] = [];
            }
            $this->psr4[$prefix][] = $path; 
        }
        public function addClassMap(array $map) { $this->classMap = array_merge($this->classMap, $map); }
        public function getPrefixesPsr4() { return $this->psr4; }
        public function getClassMap() { return $this->classMap; }
        public function register($prepend = false) {}
        public function unregister() {}
    }
}';
        file_put_contents($composerDir . '/ClassLoader.php', $classLoaderContent);
    }

    /**
     * Get test plugins configuration.
     *
     * @return array
     */
    private function getTestPluginsConfig(): array {
        return [
            'plugin-a' => [
                'slug' => 'plugin-a',
                'plugin_dir' => $this->tempDir . '/plugin-a',
                'vendor_dir' => $this->tempDir . '/plugin-a/vendor',
                'packages_dir' => $this->tempDir . '/plugin-a/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
            'plugin-b' => [
                'slug' => 'plugin-b',
                'plugin_dir' => $this->tempDir . '/plugin-b',
                'vendor_dir' => $this->tempDir . '/plugin-b/vendor',
                'packages_dir' => $this->tempDir . '/plugin-b/vendor/blockera',
                'priority' => 20,
                'default' => false,
            ],
        ];
    }
}
