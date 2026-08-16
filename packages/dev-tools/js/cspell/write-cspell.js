/**
 * Overwrite the host-root `.cspell/` folder from shared templates.
 */

const path = require( 'path' );
const { copyTemplateDir } = require( '../sync-config/copy-template-dir' );

const TEMPLATE_DIR = path.join( __dirname, '..', '..', 'cspell' );

function writeCspell( { root } ) {
	return copyTemplateDir( TEMPLATE_DIR, path.join( root, '.cspell' ) );
}

module.exports = {
	writeCspell,
};
