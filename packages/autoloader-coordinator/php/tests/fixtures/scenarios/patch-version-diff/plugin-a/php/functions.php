<?php
/**
 * Name Utils - Version 1.0.0 (Plugin A)
 * Scenario: patch-version-diff (1.0.0 vs 1.0.1)
 * 
 * @package Blockera\NameUtils
 * @version 1.0.0
 */

if ( ! defined( 'BLOCKERA_NAME_UTILS_VERSION' ) ) {
    define( 'BLOCKERA_NAME_UTILS_VERSION', '1.0.0' );
}

if ( ! defined( 'BLOCKERA_NAME_UTILS_LOADED_FROM' ) ) {
    define( 'BLOCKERA_NAME_UTILS_LOADED_FROM', 'plugin-a' );
}

if ( ! function_exists( 'blockera_name_utils_get_version' ) ) {
    function blockera_name_utils_get_version(): string {
        return '1.0.0';
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
            'version'     => '1.0.0',
            'loaded_from' => 'plugin-a',
            'file'        => __FILE__,
            'scenario'    => 'patch-version-diff',
        ];
    }
}

