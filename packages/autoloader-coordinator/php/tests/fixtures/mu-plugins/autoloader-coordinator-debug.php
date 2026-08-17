<?php
/**
 * Plugin Name: Autoloader Coordinator Debug
 * Description: Displays which plugin loaded the autoloader-coordinator on the homepage.
 * Version: 1.0.0
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Display autoloader coordinator info on the homepage.
 */
add_action( 'wp_footer', function() {
    if ( ! is_front_page() && ! is_home() ) {
        return;
    }

    // Check if the Coordinator class exists
    if ( ! class_exists( '\Blockera\SharedAutoload\Coordinator' ) ) {
        echo '<div style="position: fixed; bottom: 20px; right: 20px; background: #dc3545; color: white; padding: 15px 25px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <strong>⚠️ Autoloader Coordinator:</strong> Not loaded!
        </div>';
        return;
    }

    $coordinator = \Blockera\SharedAutoload\Coordinator::getInstance();
    
    // Get registered plugins
    $registered_plugins = [];
    $loaded_from = 'Unknown';
    
    // Try to get information from the coordinator
    if ( method_exists( $coordinator, 'getRegisteredPlugins' ) ) {
        $registered_plugins = $coordinator->getRegisteredPlugins();
    }
    
    // Get the plugin that loaded the coordinator (the one with highest priority or default)
    $dependencies = apply_filters( 'blockera/autoloader-coordinator/plugins/dependencies', [] );
    
    // Find which plugin loaded it first (based on priority and default flag)
    $primary_plugin = 'Unknown';
    $highest_priority = PHP_INT_MAX;
    
    foreach ( $dependencies as $plugin_name => $config ) {
        $priority = $config['priority'] ?? 10;
        $is_default = $config['default'] ?? false;
        
        if ( $priority < $highest_priority || ( $priority === $highest_priority && $is_default ) ) {
            $highest_priority = $priority;
            $primary_plugin = $plugin_name;
        }
    }
    
    // Get the Coordinator class file path to determine which plugin's symlink was used
    $reflection = new \ReflectionClass( '\Blockera\SharedAutoload\Coordinator' );
    $coordinator_file = $reflection->getFileName();
    
    // Extract plugin name from path
    if ( preg_match( '/plugins\/(plugin-[ab])\//', $coordinator_file, $matches ) ) {
        $loaded_from = $matches[1];
    } elseif ( strpos( $coordinator_file, 'autoloader-coordinator' ) !== false ) {
        $loaded_from = 'autoloader-coordinator (standalone)';
    }
    
    $plugin_count = count( $dependencies );
    $plugin_list = implode( ', ', array_keys( $dependencies ) );
    
    echo '<div style="position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 20px 25px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 400px; backdrop-filter: blur(10px);">
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🔧</span> Autoloader Coordinator
        </div>
        <div style="display: grid; gap: 8px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                <span style="opacity: 0.8;">Loaded from:</span>
                <strong style="color: #4ade80;">' . esc_html( $loaded_from ) . '</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                <span style="opacity: 0.8;">Primary plugin:</span>
                <strong style="color: #fbbf24;">' . esc_html( $primary_plugin ) . '</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                <span style="opacity: 0.8;">Registered plugins:</span>
                <strong>' . esc_html( $plugin_count ) . '</strong>
            </div>
            <div style="padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 11px; opacity: 0.7;">
                ' . esc_html( $plugin_list ) . '
            </div>
            <div style="padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 10px; opacity: 0.5; word-break: break-all;">
                Path: ' . esc_html( $coordinator_file ) . '
            </div>
        </div>
    </div>';
}, 999 );

/**
 * Also add admin notice with coordinator info.
 */
add_action( 'admin_notices', function() {
    if ( ! class_exists( '\Blockera\SharedAutoload\Coordinator' ) ) {
        echo '<div class="notice notice-error"><p><strong>Autoloader Coordinator:</strong> Not loaded!</p></div>';
        return;
    }
    
    $reflection = new \ReflectionClass( '\Blockera\SharedAutoload\Coordinator' );
    $coordinator_file = $reflection->getFileName();
    
    $loaded_from = 'Unknown';
    if ( preg_match( '/plugins\/(plugin-[ab])\//', $coordinator_file, $matches ) ) {
        $loaded_from = $matches[1];
    } elseif ( strpos( $coordinator_file, 'autoloader-coordinator' ) !== false ) {
        $loaded_from = 'autoloader-coordinator (standalone)';
    }
    
    $dependencies = apply_filters( 'blockera/autoloader-coordinator/plugins/dependencies', [] );
    $plugin_list = implode( ', ', array_keys( $dependencies ) );
    
    echo '<div class="notice notice-info"><p><strong>🔧 Autoloader Coordinator:</strong> Loaded from <code>' . esc_html( $loaded_from ) . '</code> | Registered plugins: ' . esc_html( $plugin_list ) . '</p></div>';
});

