<?php

namespace Blockera\Dev\PhpUnit;

use RuntimeException;

/**
 * Run block-markup HTML prettier (Node) on a string.
 */
class PrettifyMarkup {

	/**
	 * Cached Node binary for this request.
	 *
	 * @var string|null
	 */
	private static $nodeBin;

	/**
	 * @param string      $html        Markup to format.
	 * @param string|null $productRoot Product root with package.json / node_modules.
	 *
	 * @return string Prettified HTML.
	 */
	public static function html( string $html, ?string $productRoot = null ): string {
		$productRoot = $productRoot ?: (string) getcwd();
		$node        = self::resolveNode( $productRoot );
		$script      = dirname( __DIR__, 2 ) . '/dev-tools/js/block-markup/prettify-stdin.js';

		if ( ! is_file( $script ) ) {
			throw new RuntimeException( 'block-markup prettify-stdin.js not found: ' . $script );
		}

		$descriptors = array(
			0 => array( 'pipe', 'r' ),
			1 => array( 'pipe', 'w' ),
			2 => array( 'pipe', 'w' ),
		);

		$process = proc_open(
			array( $node, $script, $productRoot ),
			$descriptors,
			$pipes,
			$productRoot
		);

		if ( ! is_resource( $process ) ) {
			throw new RuntimeException( 'Failed to start Node for snapshot HTML prettier.' );
		}

		fwrite( $pipes[0], $html );
		fclose( $pipes[0] );

		$stdout = stream_get_contents( $pipes[1] );
		fclose( $pipes[1] );
		$stderr = stream_get_contents( $pipes[2] );
		fclose( $pipes[2] );

		$code = proc_close( $process );

		if ( 0 !== $code ) {
			throw new RuntimeException(
				'block-markup prettier failed (exit ' . $code . '): ' . trim( (string) $stderr )
			);
		}

		return (string) $stdout;
	}

	/**
	 * @param string $productRoot Product root.
	 *
	 * @return string Node binary path or `node`.
	 */
	private static function resolveNode( string $productRoot ): string {
		if ( null !== self::$nodeBin ) {
			return self::$nodeBin;
		}

		$env = getenv( 'BLOCKERA_NODE_BIN' );
		if ( is_string( $env ) && '' !== $env && self::isUsableBinary( $env ) ) {
			self::$nodeBin = $env;
			return self::$nodeBin;
		}

		if ( self::commandExists( 'node' ) ) {
			self::$nodeBin = 'node';
			return self::$nodeBin;
		}

		$cached = $productRoot . '/.cache/wp-env-node/bin/node';
		if ( self::isUsableBinary( $cached ) ) {
			self::$nodeBin = $cached;
			return self::$nodeBin;
		}

		throw new RuntimeException(
			'Node is required to prettify snapshot HTML. Run `npm run test:snapshots:ensure-node` and retry.'
		);
	}

	/**
	 * @param string $path Candidate binary.
	 *
	 * @return bool
	 */
	private static function isUsableBinary( string $path ): bool {
		return is_file( $path ) && is_executable( $path );
	}

	/**
	 * @param string $bin Command name.
	 *
	 * @return bool
	 */
	private static function commandExists( string $bin ): bool {
		$out  = array();
		$code = 1;
		exec( 'command -v ' . escapeshellarg( $bin ) . ' 2>/dev/null', $out, $code );

		return 0 === $code && ! empty( $out );
	}
}
