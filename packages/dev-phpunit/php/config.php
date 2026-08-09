<?php

/**
 * Consumer product root (plugin/theme) that owns vendor/.
 *
 * Supports both layouts:
 * - packages/dev-phpunit/php (monorepo / sibling checkout)
 * - packages/global-packages/packages/dev-phpunit/php (sparse submodule)
 */
$root_path = dirname( __DIR__, 3 );
for ( $i = 0; $i < 4 && ! file_exists( $root_path . '/vendor/autoload.php' ); $i++ ) {
	$root_path = dirname( $root_path );
}

if ( ! file_exists( $root_path . '/vendor/autoload.php' ) ) {
	fwrite( STDERR, 'dev-phpunit: could not locate vendor/autoload.php from ' . __DIR__ . PHP_EOL );
	exit( 1 );
}

require $root_path . '/vendor/autoload.php';

if ( file_exists( $root_path . '/.env' ) ) {

	// Env Loading...
	$dotenv = Dotenv\Dotenv::createImmutable( $root_path );
	$dotenv->safeLoad();
}
