<?php
/**
 * PHPUnit bootstrap for autoloader-coordinator (Brain Monkey, no WordPress).
 *
 * These tests run in the blockera-global-packages submodule workflow, not in
 * consumer phpunit suites. Coordinator calls a few WP APIs from the global
 * namespace, so this file provides in-memory stubs before the class loads.
 *
 * @package Blockera\SharedAutoload\Tests
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/tmp/wordpress/' );
}

if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}

if ( ! function_exists( 'get_transient' ) ) {
	/**
	 * In-memory transient getter for tests.
	 *
	 * @param string $transient Transient key.
	 * @return mixed
	 */
	function get_transient( $transient ) {
		global $__test_transients;

		return isset( $__test_transients[ $transient ] ) ? $__test_transients[ $transient ] : false;
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	/**
	 * In-memory transient setter for tests.
	 *
	 * @param string $transient  Transient key.
	 * @param mixed  $value      Value.
	 * @param int    $expiration Unused expiration (API compatibility).
	 * @return bool
	 */
	function set_transient( $transient, $value, $expiration = 0 ) {
		global $__test_transients;

		$__test_transients[ $transient ] = $value;

		return true;
	}
}

if ( ! function_exists( 'delete_transient' ) ) {
	/**
	 * In-memory transient deleter for tests.
	 *
	 * @param string $transient Transient key.
	 * @return bool
	 */
	function delete_transient( $transient ) {
		global $__test_transients;

		unset( $__test_transients[ $transient ] );

		return true;
	}
}

if ( ! function_exists( 'apply_filters' ) ) {
	/**
	 * Pass-through apply_filters stub (Brain Monkey may wrap this).
	 *
	 * @param string $hook  Filter hook.
	 * @param mixed  $value Value.
	 * @param mixed  ...$args Extra args.
	 * @return mixed
	 */
	function apply_filters( $hook, $value, ...$args ) {
		unset( $hook, $args );

		return $value;
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	/**
	 * Minimal sanitize_text_field stub used by Coordinator::bootstrap().
	 *
	 * @param mixed $str Input.
	 * @return string
	 */
	function sanitize_text_field( $str ) {
		return is_string( $str ) ? $str : '';
	}
}

if ( ! class_exists( 'wpdb' ) ) {
	/**
	 * Minimal wpdb stub for invalidatePackageManifest().
	 */
	class wpdb {
		/**
		 * Options table name.
		 *
		 * @var string
		 */
		public $options = 'wp_options';

		/**
		 * Escape LIKE wildcards.
		 *
		 * @param string $text Raw text.
		 * @return string
		 */
		public function esc_like( $text ) {
			return addcslashes( $text, '_%\\' );
		}

		/**
		 * Prepare a query (sprintf-style for tests).
		 *
		 * @param string $query Query with placeholders.
		 * @param mixed  ...$args Values.
		 * @return string
		 */
		public function prepare( $query, ...$args ) {
			return vsprintf( str_replace( '%s', "'%s'", $query ), $args );
		}

		/**
		 * Run a query (no-op).
		 *
		 * @param string $query SQL.
		 * @return bool
		 */
		public function query( $query ) {
			unset( $query );

			return true;
		}
	}
}

global $wpdb;
if ( null === $wpdb ) {
	$wpdb = new wpdb();
}

$root_path = dirname( __DIR__, 4 );
for ( $i = 0; $i < 4 && ! file_exists( $root_path . '/vendor/autoload.php' ); $i++ ) {
	$root_path = dirname( $root_path );
}

$autoloader = $root_path . '/vendor/autoload.php';

if ( ! file_exists( $autoloader ) ) {
	fwrite( STDERR, "Please run 'composer install' at the global-packages root before running tests.\n" );
	exit( 1 );
}

require_once $autoloader;

// Composer files-autoload of loader.php may have already run before ABSPATH
// was defined (PHPUnit bin loads vendor/autoload.php first). Load the class now.
require_once dirname( __DIR__, 2 ) . '/class-shared-autoload-coordinator.php';
