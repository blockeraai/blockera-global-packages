<?php
/**
 * The Blockera products registry hooks.
 *
 * @package blockera/products/php/hooks.php
 */

if ( function_exists( 'add_action' ) ) {

	// Late priority so consumers assets providers already registered the "@blockera/products" handle.
	add_action( 'admin_enqueue_scripts', 'blockera_products_l10n', 100 );
}
