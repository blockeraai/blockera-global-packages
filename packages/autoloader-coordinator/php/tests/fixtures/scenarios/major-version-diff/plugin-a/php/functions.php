<?php
/**
 * Name Utils - Version 3.0.0 (Plugin A)
 * Scenario: major-version-diff (3.0.0 vs 1.0.0)
 * 
 * @package Blockera\NameUtils
 * @version 3.0.0
 */

if ( ! defined( 'BLOCKERA_NAME_UTILS_VERSION' ) ) {
    define( 'BLOCKERA_NAME_UTILS_VERSION', '3.0.0' );
}

if ( ! defined( 'BLOCKERA_NAME_UTILS_LOADED_FROM' ) ) {
    define( 'BLOCKERA_NAME_UTILS_LOADED_FROM', 'plugin-a' );
}

if ( ! function_exists( 'blockera_name_utils_get_version' ) ) {
    function blockera_name_utils_get_version(): string {
        return '3.0.0';
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
            'version'     => '3.0.0',
            'loaded_from' => 'plugin-a',
            'file'        => __FILE__,
            'scenario'    => 'major-version-diff',
        ];
    }
}

// v3.0.0 exclusive feature
if ( ! function_exists( 'blockera_format_name' ) ) {
    function blockera_format_name( string $name ): string {
        return ucwords( strtolower( $name ) );
    }
}

// v3.0.0 new feature
if ( ! function_exists( 'blockera_validate_name' ) ) {
    function blockera_validate_name( string $name ): bool {
        return strlen( trim( $name ) ) >= 2;
    }
}

