/**
 * Overwrite the host-root `.husky/` folder from shared templates.
 * Hook scripts at the folder root are chmod 0755 so Git can run them.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const TEMPLATE_DIR = path.join( __dirname, '..', '..', 'husky' );
const HOOK_MODE = 0o755;
const HOOK_NAMES = [
	'pre-commit',
	'commit-msg',
	'pre-push',
	'post-checkout',
];

function writeHuskyInternals( destDir ) {
	const internalsDir = path.join( destDir, '_' );
	const huskySh = path.join( TEMPLATE_DIR, 'internals', 'husky.sh' );

	if ( ! fs.existsSync( huskySh ) ) {
		throw new Error( `missing Husky template: ${ huskySh }` );
	}

	fs.mkdirSync( internalsDir, { recursive: true } );
	fs.writeFileSync( path.join( internalsDir, '.gitignore' ), '*\n' );
	fs.copyFileSync( huskySh, path.join( internalsDir, 'husky.sh' ) );
}

function writeHuskyHooks( destDir ) {
	for ( const name of HOOK_NAMES ) {
		const from = path.join( TEMPLATE_DIR, name );

		if ( ! fs.existsSync( from ) ) {
			throw new Error( `missing Husky template: ${ from }` );
		}

		const to = path.join( destDir, name );

		fs.copyFileSync( from, to );
		fs.chmodSync( to, HOOK_MODE );
	}
}

function writeHusky( { root } ) {
	const dest = path.join( root, '.husky' );

	fs.rmSync( dest, { recursive: true, force: true } );
	fs.mkdirSync( dest, { recursive: true } );
	writeHuskyHooks( dest );
	writeHuskyInternals( dest );

	return dest;
}

module.exports = {
	writeHusky,
};
