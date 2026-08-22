<?php
/**
 * Base TestCase for Autoloader Coordinator tests.
 *
 * @package Blockera\SharedAutoload\Tests
 */

namespace Blockera\SharedAutoload\Tests;

use Brain\Monkey;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase as PHPUnitTestCase;
use ReflectionClass;
use ReflectionProperty;

/**
 * Base test case with Brain Monkey integration.
 */
abstract class TestCase extends PHPUnitTestCase {

    use MockeryPHPUnitIntegration;

    /**
     * Sets up Brain Monkey before each test.
     */
    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();

        // Clear transient storage and coordinator include-once globals.
        global $__test_transients;
        $__test_transients = [];
        unset(
            $GLOBALS['blockera_autoload_files'],
            $GLOBALS['blockera_autoload_file_paths'],
            $GLOBALS['__composer_autoload_files']
        );
    }

    /**
     * Tears down Brain Monkey after each test.
     */
    protected function tearDown(): void {
        // Clear transient storage.
        global $__test_transients;
        $__test_transients = [];

        Monkey\tearDown();
        parent::tearDown();
    }

    /**
     * Reset Coordinator singleton for testing.
     *
     * @return void
     */
    protected function resetCoordinatorSingleton(): void {
        $reflection = new ReflectionClass(\Blockera\SharedAutoload\Coordinator::class);
        $instance = $reflection->getProperty('instance');
        $instance->setAccessible(true);
        $instance->setValue(null, null);
    }

    /**
     * Get private/protected property value from object.
     *
     * @param object $object   Object instance.
     * @param string $property Property name.
     * @return mixed
     */
    protected function getPrivateProperty(object $object, string $property) {
        $reflection = new ReflectionProperty(get_class($object), $property);
        $reflection->setAccessible(true);
        return $reflection->getValue($object);
    }

    /**
     * Set private/protected property value on object.
     *
     * @param object $object   Object instance.
     * @param string $property Property name.
     * @param mixed  $value    Value to set.
     * @return void
     */
    protected function setPrivateProperty(object $object, string $property, $value): void {
        $reflection = new ReflectionProperty(get_class($object), $property);
        $reflection->setAccessible(true);
        $reflection->setValue($object, $value);
    }

    /**
     * Invoke private/protected method on object.
     *
     * @param object $object Object instance.
     * @param string $method Method name.
     * @param array  $args   Method arguments.
     * @return mixed
     */
    protected function invokePrivateMethod(object $object, string $method, array $args = []) {
        $reflection = new ReflectionClass(get_class($object));
        $method = $reflection->getMethod($method);
        $method->setAccessible(true);
        return $method->invokeArgs($object, $args);
    }

    /**
     * Create a temporary directory structure for testing.
     *
     * @param string $basePath Base path for test fixtures.
     * @param array  $structure Directory structure to create.
     * @return string The created temporary directory path.
     */
    protected function createTempFixture(string $basePath, array $structure): string {
        if (!is_dir($basePath)) {
            mkdir($basePath, 0777, true);
        }

        foreach ($structure as $path => $content) {
            $fullPath = $basePath . '/' . $path;
            $dir = dirname($fullPath);

            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }

            if (is_array($content)) {
                // It's a directory with more content.
                $this->createTempFixture($basePath, [$path => $content]);
            } else {
                // It's a file.
                file_put_contents($fullPath, $content);
            }
        }

        return $basePath;
    }

    /**
     * Remove temporary directory recursively.
     *
     * @param string $dir Directory to remove.
     * @return void
     */
    protected function removeTempDir(string $dir): void {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->removeTempDir($path) : unlink($path);
        }
        rmdir($dir);
    }

    /**
     * Set a transient value for testing.
     *
     * @param string $key   Transient key.
     * @param mixed  $value Transient value.
     * @return void
     */
    protected function setTestTransient(string $key, $value): void {
        global $__test_transients;
        $__test_transients[$key] = $value;
    }

    /**
     * Get a transient value for testing.
     *
     * @param string $key Transient key.
     * @return mixed
     */
    protected function getTestTransient(string $key) {
        global $__test_transients;
        return $__test_transients[$key] ?? false;
    }
}
