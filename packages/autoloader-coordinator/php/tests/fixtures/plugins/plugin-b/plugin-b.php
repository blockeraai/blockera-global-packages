<?php
/**
 * Plugin Name: Autoloader Coordinator - Plugin B
 * Description: Fixture plugin B for coordinator version-resolution tests.
 * Version: 1.0.0
 * Author: Blockera
 * License: GPL-2.0-or-later
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * Text Domain: plugin-b
 *
 * @package Plugin_B
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/packages/autoloader-coordinator/bootstrap.php';

blockera_bootstrap_shared_autoloader(
	'plugin-b',
	__DIR__,
	array(
		'priority'   => 20,
		'default'    => false,
		'file'       => __FILE__,
		'companions' => array(
			array(
				'slug'        => 'plugin-a',
				'plugin_file' => 'plugin-a/plugin-a.php',
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
			'<div class="notice notice-info is-dismissible"><p><strong>Plugin B:</strong> name-utils package v%s loaded from %s</p></div>',
			esc_html( blockera_name_utils_get_version() ),
			esc_html( blockera_name_utils_get_loaded_from() )
		);
	}
);
