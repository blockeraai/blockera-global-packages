<?php
/**
 * The Blockera products registry hooks.
 * 
 * This file is used to hook into the WordPress lifecycle to ensure the products registry is properly initialized and ready to use.
 *
 * @package blockera/products/php/hooks.php
 */

if ( function_exists( 'add_action' ) ) {

	// After `init` so consumer bootstraps (e.g. blockera php/app.php) have
	// already attached `blockera/products/registry/init` registrants.
	add_action( 'wp_loaded', 'blockera_products_bootstrap', 0 );

	// Late priority so consumers assets providers already registered the "@blockera/products" handle.
	// Editor scripts register on enqueue_block_editor_assets, not admin_enqueue_scripts.
	add_action( 'admin_enqueue_scripts', 'blockera_products_l10n', 100 );
	add_action( 'enqueue_block_editor_assets', 'blockera_products_l10n', 100 );
}
