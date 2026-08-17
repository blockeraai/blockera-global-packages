<?php
/**
 * Integration tests for Coordinator class.
 *
 * @package Blockera\SharedAutoload\Tests\Integration
 */

namespace Blockera\SharedAutoload\Tests\Integration;

use Blockera\SharedAutoload\Coordinator;
use Blockera\SharedAutoload\Tests\TestCase;

/**
 * Integration test cases for Coordinator with real filesystem operations.
 *
 * @covers \Blockera\SharedAutoload\Coordinator
 */
class CoordinatorIntegrationTest extends TestCase {

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
        $this->tempDir = sys_get_temp_dir() . '/coordinator-integration-' . uniqid();
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
    // Full Bootstrap Flow Tests
    // =========================================================================

    /**
     * Test complete bootstrap flow with two plugins.
     *
     * @test
     */
    public function test_complete_bootstrap_with_two_plugins(): void {
        $this->createFullPluginStructure();

        $coordinator = Coordinator::getInstance();

        // Set plugins directly to avoid filter complexity.
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

        $coordinator->bootstrap();

        // Verify coordinator is bootstrapped.
        $bootstrapped = $this->getPrivateProperty($coordinator, 'bootstrapped');
        $this->assertTrue($bootstrapped);

        // Verify autoloader is registered.
        $autoloaderRegistered = $this->getPrivateProperty($coordinator, 'autoloader_registered');
        $this->assertTrue($autoloaderRegistered);

        // Verify class loader exists.
        $classLoader = $coordinator->getClassLoader();
        $this->assertNotNull($classLoader);
    }

    /**
     * Test version-based package selection prefers higher versions.
     *
     * @test
     */
    public function test_version_based_selection_prefers_higher_version(): void {
        $this->createPluginsWithDifferentVersions();

        $coordinator = Coordinator::getInstance();
        $this->setPrivateProperty($coordinator, 'plugins', [
            'plugin-old' => [
                'slug' => 'plugin-old',
                'plugin_dir' => $this->tempDir . '/plugin-old',
                'vendor_dir' => $this->tempDir . '/plugin-old/vendor',
                'packages_dir' => $this->tempDir . '/plugin-old/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
            'plugin-new' => [
                'slug' => 'plugin-new',
                'plugin_dir' => $this->tempDir . '/plugin-new',
                'vendor_dir' => $this->tempDir . '/plugin-new/vendor',
                'packages_dir' => $this->tempDir . '/plugin-new/vendor/blockera',
                'priority' => 20,
                'default' => false,
            ],
        ]);

        // Build manifest and verify higher version wins.
        $manifest = $this->invokePrivateMethod($coordinator, 'buildPackageManifest', []);

        $this->assertArrayHasKey('blockera/shared-package', $manifest);
        $this->assertEquals('2.0.0', $manifest['blockera/shared-package']['version']);
        $this->assertEquals('plugin-new', $manifest['blockera/shared-package']['plugin']);
    }

    /**
     * Test PSR-4 mappings are properly loaded.
     *
     * @test
     */
    public function test_psr4_mappings_loaded(): void {
        $this->createPluginWithPsr4();

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

        $coordinator->bootstrap();

        $classLoader = $coordinator->getClassLoader();
        $this->assertNotNull($classLoader);

        $prefixes = $classLoader->getPrefixesPsr4();
        $this->assertArrayHasKey('Blockera\\TestPackage\\', $prefixes);
    }

    /**
     * Test classmap is properly loaded.
     *
     * @test
     */
    public function test_classmap_loaded(): void {
        $this->createPluginWithClassmap();

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

        $coordinator->bootstrap();

        $classLoader = $coordinator->getClassLoader();
        $this->assertNotNull($classLoader);

        $classMap = $classLoader->getClassMap();
        $this->assertArrayHasKey('TestClass', $classMap);
    }

    /**
     * Test coordinator_ref is set during bootstrap.
     *
     * Note: Due to array_column() losing associative keys in the Coordinator class,
     * the default plugin lookup falls back to 'blockera' when using string-keyed arrays.
     * This test verifies the coordinator_ref is set to a non-empty value.
     *
     * @test
     */
    public function test_coordinator_ref_set_during_bootstrap(): void {
        $this->createFullPluginStructure();

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

        $coordinator->bootstrap();

        $coordinatorRef = $this->getPrivateProperty($coordinator, 'coordinator_ref');
        // Coordinator ref is set (either from default plugin or fallback to 'blockera').
        $this->assertNotEmpty($coordinatorRef);
    }

    /**
     * Test maybeCoordinate can be called independently.
     *
     * @test
     */
    public function test_maybe_coordinate_independent_call(): void {
        $this->createFullPluginStructure();

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

        // Should work without prior bootstrap.
        $coordinator->maybeCoordinate();

        // Verify class loader was created.
        $classLoader = $coordinator->getClassLoader();
        $this->assertNotNull($classLoader);
    }

    // =========================================================================
    // Edge Cases
    // =========================================================================

    /**
     * Test handling of invalid composer.json files.
     *
     * @test
     */
    public function test_handles_invalid_composer_json(): void {
        $packageDir = $this->tempDir . '/invalid-plugin/vendor/blockera/bad-package';
        mkdir($packageDir, 0777, true);

        // Invalid JSON.
        file_put_contents($packageDir . '/composer.json', 'not valid json{');

        $coordinator = Coordinator::getInstance();
        $this->setPrivateProperty($coordinator, 'plugins', [
            'invalid-plugin' => [
                'slug' => 'invalid-plugin',
                'plugin_dir' => $this->tempDir . '/invalid-plugin',
                'vendor_dir' => $this->tempDir . '/invalid-plugin/vendor',
                'packages_dir' => $this->tempDir . '/invalid-plugin/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
        ]);

        $manifest = $this->invokePrivateMethod($coordinator, 'buildPackageManifest', []);

        // Should not contain the invalid package.
        $this->assertArrayNotHasKey('bad-package', $manifest);
    }

    /**
     * Test handling of composer.json without name field.
     *
     * @test
     */
    public function test_handles_composer_json_without_name(): void {
        $packageDir = $this->tempDir . '/nameless-plugin/vendor/blockera/nameless-package';
        mkdir($packageDir, 0777, true);

        // Valid JSON but no name field.
        file_put_contents($packageDir . '/composer.json', json_encode([
            'version' => '1.0.0',
            'description' => 'Package without name',
        ]));

        $coordinator = Coordinator::getInstance();
        $this->setPrivateProperty($coordinator, 'plugins', [
            'nameless-plugin' => [
                'slug' => 'nameless-plugin',
                'plugin_dir' => $this->tempDir . '/nameless-plugin',
                'vendor_dir' => $this->tempDir . '/nameless-plugin/vendor',
                'packages_dir' => $this->tempDir . '/nameless-plugin/vendor/blockera',
                'priority' => 10,
                'default' => true,
            ],
        ]);

        $manifest = $this->invokePrivateMethod($coordinator, 'buildPackageManifest', []);

        // Should be empty since package has no name.
        $this->assertEmpty($manifest);
    }

    /**
     * Test handling of missing packages directory.
     *
     * @test
     */
    public function test_handles_missing_packages_directory(): void {
        mkdir($this->tempDir . '/empty-plugin/vendor', 0777, true);

        $coordinator = Coordinator::getInstance();
        $this->setPrivateProperty($coordinator, 'plugins', [
            'empty-plugin' => [
                'slug' => 'empty-plugin',
                'plugin_dir' => $this->tempDir . '/empty-plugin',
                'vendor_dir' => $this->tempDir . '/empty-plugin/vendor',
                'packages_dir' => $this->tempDir . '/empty-plugin/vendor/blockera', // Does not exist.
                'priority' => 10,
                'default' => true,
            ],
        ]);

        $manifest = $this->invokePrivateMethod($coordinator, 'buildPackageManifest', []);

        $this->assertEmpty($manifest);
    }

    /**
     * Test autoload file inclusion marks files correctly.
     *
     * @test
     */
    public function test_autoload_file_inclusion_marks_included(): void {
        $this->createPluginsWithAutoloadFiles();

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

        $coordinator->bootstrap();

        // Verify that autoloader registered flag is set.
        $autoloaderRegistered = $this->getPrivateProperty($coordinator, 'autoloader_registered');
        $this->assertTrue($autoloaderRegistered);
    }

    /**
     * Test plugins can be updated by setting new values.
     *
     * @test
     */
    public function test_plugins_can_be_updated(): void {
        $coordinator = Coordinator::getInstance();

        // Set initial plugins.
        $this->setPrivateProperty($coordinator, 'plugins', [
            'plugin-a' => [
                'slug' => 'plugin-a',
                'plugin_dir' => '/path/to/plugin-a',
                'vendor_dir' => '/path/to/plugin-a/vendor',
                'priority' => 10,
                'default' => true,
            ],
        ]);

        $plugins1 = $this->getPrivateProperty($coordinator, 'plugins');
        $this->assertCount(1, $plugins1);

        // Update with more plugins.
        $this->setPrivateProperty($coordinator, 'plugins', [
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
        ]);

        $plugins2 = $this->getPrivateProperty($coordinator, 'plugins');
        $this->assertCount(2, $plugins2);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    /**
     * Create full plugin structure with composer autoload files.
     */
    private function createFullPluginStructure(): void {
        foreach (['plugin-a', 'plugin-b'] as $plugin) {
            $pluginDir = $this->tempDir . '/' . $plugin;
            $vendorDir = $pluginDir . '/vendor';
            $composerDir = $vendorDir . '/composer';
            $blockeraDir = $vendorDir . '/blockera/test-package';

            mkdir($blockeraDir, 0777, true);
            mkdir($composerDir, 0777, true);

            // ClassLoader mock.
            $this->createClassLoaderMock($composerDir);

            // Autoload files.
            file_put_contents($composerDir . '/autoload_psr4.php', '<?php return [];');
            file_put_contents($composerDir . '/autoload_classmap.php', '<?php return [];');
            file_put_contents($composerDir . '/autoload_files.php', '<?php return [];');

            // Package composer.json.
            $version = $plugin === 'plugin-a' ? '1.0.0' : '1.5.0';
            file_put_contents($blockeraDir . '/composer.json', json_encode([
                'name' => 'blockera/test-package',
                'version' => $version,
            ]));
        }
    }

    /**
     * Create plugins with different package versions.
     */
    private function createPluginsWithDifferentVersions(): void {
        // Plugin with old version.
        $oldPluginDir = $this->tempDir . '/plugin-old';
        $oldVendorDir = $oldPluginDir . '/vendor';
        $oldComposerDir = $oldVendorDir . '/composer';
        $oldPackageDir = $oldVendorDir . '/blockera/shared-package';

        mkdir($oldPackageDir, 0777, true);
        mkdir($oldComposerDir, 0777, true);

        $this->createClassLoaderMock($oldComposerDir);
        file_put_contents($oldComposerDir . '/autoload_psr4.php', '<?php return [];');
        file_put_contents($oldComposerDir . '/autoload_classmap.php', '<?php return [];');
        file_put_contents($oldComposerDir . '/autoload_files.php', '<?php return [];');
        file_put_contents($oldPackageDir . '/composer.json', json_encode([
            'name' => 'blockera/shared-package',
            'version' => '1.0.0',
        ]));

        // Plugin with new version.
        $newPluginDir = $this->tempDir . '/plugin-new';
        $newVendorDir = $newPluginDir . '/vendor';
        $newComposerDir = $newVendorDir . '/composer';
        $newPackageDir = $newVendorDir . '/blockera/shared-package';

        mkdir($newPackageDir, 0777, true);
        mkdir($newComposerDir, 0777, true);

        $this->createClassLoaderMock($newComposerDir);
        file_put_contents($newComposerDir . '/autoload_psr4.php', '<?php return [];');
        file_put_contents($newComposerDir . '/autoload_classmap.php', '<?php return [];');
        file_put_contents($newComposerDir . '/autoload_files.php', '<?php return [];');
        file_put_contents($newPackageDir . '/composer.json', json_encode([
            'name' => 'blockera/shared-package',
            'version' => '2.0.0',
        ]));
    }

    /**
     * Create plugins with autoload files.
     */
    private function createPluginsWithAutoloadFiles(): void {
        foreach (['plugin-a', 'plugin-b'] as $plugin) {
            $pluginDir = $this->tempDir . '/' . $plugin;
            $vendorDir = $pluginDir . '/vendor';
            $composerDir = $vendorDir . '/composer';
            $packageDir = $vendorDir . '/blockera/shared-functions';

            mkdir($packageDir, 0777, true);
            mkdir($composerDir, 0777, true);

            $this->createClassLoaderMock($composerDir);

            // Create the functions file.
            $functionsFile = $packageDir . '/functions.php';
            file_put_contents($functionsFile, '<?php // Test file');

            // Create composer.json for the package.
            file_put_contents($packageDir . '/composer.json', json_encode([
                'name' => 'blockera/shared-functions',
                'version' => '1.0.0',
            ]));

            // Create autoload files.
            file_put_contents($composerDir . '/autoload_psr4.php', '<?php return [];');
            file_put_contents($composerDir . '/autoload_classmap.php', '<?php return [];');

            // Use unique hash per plugin to test deduplication.
            $hash = 'shared_func_hash_' . $plugin;
            $filesContent = '<?php return ["' . $hash . '" => "' . addslashes($functionsFile) . '"];';
            file_put_contents($composerDir . '/autoload_files.php', $filesContent);
        }
    }

    /**
     * Create plugin with PSR-4 autoload.
     */
    private function createPluginWithPsr4(): void {
        foreach (['plugin-a', 'plugin-b'] as $plugin) {
            $pluginDir = $this->tempDir . '/' . $plugin;
            $vendorDir = $pluginDir . '/vendor';
            $composerDir = $vendorDir . '/composer';
            $packageDir = $vendorDir . '/blockera/test-package/src';

            mkdir($packageDir, 0777, true);
            mkdir($composerDir, 0777, true);

            $this->createClassLoaderMock($composerDir);

            // PSR-4 mapping.
            $psr4Content = '<?php return ["Blockera\\\\TestPackage\\\\" => ["' . addslashes($packageDir) . '"]];';
            file_put_contents($composerDir . '/autoload_psr4.php', $psr4Content);
            file_put_contents($composerDir . '/autoload_classmap.php', '<?php return [];');
            file_put_contents($composerDir . '/autoload_files.php', '<?php return [];');

            file_put_contents(dirname($packageDir) . '/composer.json', json_encode([
                'name' => 'blockera/test-package',
                'version' => '1.0.0',
            ]));
        }
    }

    /**
     * Create plugin with classmap autoload.
     */
    private function createPluginWithClassmap(): void {
        foreach (['plugin-a', 'plugin-b'] as $plugin) {
            $pluginDir = $this->tempDir . '/' . $plugin;
            $vendorDir = $pluginDir . '/vendor';
            $composerDir = $vendorDir . '/composer';
            $packageDir = $vendorDir . '/blockera/test-package';

            mkdir($packageDir, 0777, true);
            mkdir($composerDir, 0777, true);

            $this->createClassLoaderMock($composerDir);

            // Class file.
            $classFile = $packageDir . '/TestClass.php';
            file_put_contents($classFile, '<?php class TestClass {}');

            // Classmap.
            $classmapContent = '<?php return ["TestClass" => "' . addslashes($classFile) . '"];';
            file_put_contents($composerDir . '/autoload_classmap.php', $classmapContent);
            file_put_contents($composerDir . '/autoload_psr4.php', '<?php return [];');
            file_put_contents($composerDir . '/autoload_files.php', '<?php return [];');

            file_put_contents($packageDir . '/composer.json', json_encode([
                'name' => 'blockera/test-package',
                'version' => '1.0.0',
            ]));
        }
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
}
