<?php
/**
 * Plugin Name: Autoloader Coordinator - Plugin A
 * Description: Fixture plugin A for coordinator version-resolution tests.
 * Version: 1.0.0
 * Author: Blockera
 * License: GPL-2.0-or-later
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * Text Domain: plugin-a
 *
 * @package Plugin_A
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/packages/autoloader-coordinator/bootstrap.php';

blockera_bootstrap_shared_autoloader(
	'plugin-a',
	__DIR__,
	array(
		'priority'          => 10,
		'default'           => true,
		'file'              => __FILE__,
		'defer_files_until' => array( 'plugin-b' ),
		'companions'        => array(
			array(
				'slug'        => 'plugin-b',
				'plugin_file' => 'plugin-b/plugin-b.php',
			),
		),
	)
);

add_action(
	'admin_notices',
	static function () {
		if ( ! function_exists( 'blockera_name_utils_get_version' ) || ! function_exists( 'blockera_name_utils_get_loaded_from' ) ) {
			return;
		}

		printf(
			'<div class="notice notice-info is-dismissible"><p><strong>Plugin A:</strong> name-utils package v%s loaded from %s</p></div>',
			esc_html( blockera_name_utils_get_version() ),
			esc_html( blockera_name_utils_get_loaded_from() )
		);
	}
);
