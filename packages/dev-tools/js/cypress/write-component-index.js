/**
 * Write the host Cypress component-test HTML shell.
 * Does not wipe the rest of cypress/.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const TEMPLATE_FILE = path.join(
	__dirname,
	'..',
	'..',
	'cypress',
	'support',
	'component-index.html'
);
const RELATIVE_DEST = path.join( 'cypress', 'support', 'component-index.html' );

function writeCypressComponentIndex( { root } ) {
	if ( ! fs.existsSync( TEMPLATE_FILE ) ) {
		throw new Error( `missing Cypress template: ${ TEMPLATE_FILE }` );
	}

	const dest = path.join( root, RELATIVE_DEST );

	fs.mkdirSync( path.dirname( dest ), { recursive: true } );
	fs.copyFileSync( TEMPLATE_FILE, dest );

	return dest;
}

module.exports = {
	writeCypressComponentIndex,
};
