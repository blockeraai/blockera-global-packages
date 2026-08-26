<?php
/**
 * Autoloader coordinator loader.
 *
 * @package blockera/autoloader-coordinator
 */

if ( ! defined( 'ABSPATH' ) ) {
	// Must return (not exit): Composer files-autoload runs this from vendor/autoload.php,
	// including PHPUnit's bin proxy before WordPress or the test bootstrap defines ABSPATH.
	return;
}

require_once __DIR__ . '/class-shared-autoload-coordinator.php';
