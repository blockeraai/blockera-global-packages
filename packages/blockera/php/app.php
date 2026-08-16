<?php
/**
 * The application bootstrapper.
 *
 * @package bootstrpa/app.php
 */

// phpcs:disable
// direct access is not allowed.
if (! defined('ABSPATH')) {
    exit;
}

// Lazily register the site builder as the companion product on first registry
// read. Hooked before the request-type guard so any context (rest, cron, ...)
// reading the registry still sees the companion. Self-guards when the
// blockera/products package is absent or blockera runs embedded in a theme.
add_action('blockera/products/registry/init', 'blockera_sb_register_product');

// Blockera should be loaded only on frontend, editor and admin requests.
if (! blockera_is_frontend_request() && ! blockera_is_editor_request() && ! blockera_is_admin_request()) {
    return;
}

global $blockera, $blockera_cache_key, $blockera_cache_group, $blockera_block_supports;

$external_dir = blockera_core_config('app.vendor_path') . 'blockera/';

blockera_add_icon_style_definitions();
blockera_register_core_icon_navigation_hooks();

// Add blockera object cache to non persistent group to compatible with third party cache plugins.
$blockera_cache_group = 'plugins';
$blockera_cache_key = 'blockera_instance' . BLOCKERA_SB_VERSION;

// Initialize static cache.
$blockera_cache = wp_cache_get($blockera_cache_key, $blockera_cache_group);

if ($blockera_cache !== false) {
    $blockera = $blockera_cache;
} else {
    // Optimize class initialization.
    $blockera = \Blockera\Setup\Blockera::getInstance();
    // Cache the instance.
    wp_cache_set($blockera_cache_key, $blockera, $blockera_cache_group);
}

// Conditional loading based on context.
if (blockera_is_admin()) {
    blockera_load('editor.php.hooks', $external_dir);
    blockera_load('blockera-admin.php.hooks', $external_dir);
    blockera_load('wordpress.php.Admin.Menu.hooks', $external_dir);
}

blockera_load('telemetry.php.hooks', $external_dir);

// Set the block supports.
$blockera->setBlockSupports($blockera_block_supports);
// Initialize core components with optimized bootstrap.
$blockera->bootstrap();

// Register shutdown function for cleanup.
function blockera_cleanup_cache() {
    global $blockera_cache_key, $blockera_cache_group;

    wp_cache_delete($blockera_cache_key, $blockera_cache_group);
}
add_action('shutdown', 'blockera_cleanup_cache');
