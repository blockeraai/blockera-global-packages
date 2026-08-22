<?php
/**
 * Name Utils - Version 2.0.0 (Plugin A)
 * Scenario: plugin-a-newer
 * 
 * @package Blockera\NameUtils
 * @version 2.0.0
 */

if ( ! defined( 'BLOCKERA_NAME_UTILS_VERSION' ) ) {
    define( 'BLOCKERA_NAME_UTILS_VERSION', '2.0.0' );
}

if ( ! defined( 'BLOCKERA_NAME_UTILS_LOADED_FROM' ) ) {
    define( 'BLOCKERA_NAME_UTILS_LOADED_FROM', 'plugin-a' );
}

if ( ! function_exists( 'blockera_name_utils_get_version' ) ) {
    function blockera_name_utils_get_version(): string {
        return '2.0.0';
    }
}

if ( ! function_exists( 'blockera_name_utils_get_loaded_from' ) ) {
    function blockera_name_utils_get_loaded_from(): string {
        return 'plugin-a';
    }
}

if ( ! function_exists( 'blockera_name_utils_get_metadata' ) ) {
    function blockera_name_utils_get_metadata(): array {
        return [
            'version'     => '2.0.0',
            'loaded_from' => 'plugin-a',
            'file'        => __FILE__,
            'scenario'    => 'plugin-a-newer',
        ];
    }
}

// v2.0.0 exclusive feature
if ( ! function_exists( 'blockera_format_name' ) ) {
    function blockera_format_name( string $name ): string {
        return ucwords( strtolower( $name ) );
    }
}

