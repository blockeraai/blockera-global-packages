<?php
/**
 * Name Formatter Class - Version 2.0.0 (Plugin A)
 * Scenario: plugin-a-newer
 * 
 * @package Blockera\NameUtils
 * @version 2.0.0
 */

namespace Blockera\NameUtils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Name Formatter utility class.
 */
class NameFormatter {

	/**
	 * Get the version of this package.
	 *
	 * @return string
	 */
	public static function get_version(): string {
		return '2.0.0';
	}

	/**
	 * Get the plugin this package was loaded from.
	 *
	 * @return string
	 */
	public static function get_loaded_from(): string {
		return 'plugin-a';
	}

	/**
	 * Format a name with a greeting.
	 *
	 * @param string $name The name to format.
	 * @return string
	 */
	public static function format( string $name ): string {
		return sprintf( 'Hello, %s! (from plugin-a v2.0.0)', ucwords( strtolower( $name ) ) );
	}

	/**
	 * Get metadata about this package instance.
	 *
	 * @return array
	 */
	public static function get_metadata(): array {
		return [
			'version'     => '2.0.0',
			'loaded_from' => 'plugin-a',
			'class'       => __CLASS__,
			'file'        => __FILE__,
			'scenario'    => 'plugin-a-newer',
		];
	}
}

