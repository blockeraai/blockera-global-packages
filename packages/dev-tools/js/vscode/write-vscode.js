/**
 * Overwrite the host-root `.vscode/` folder from shared templates.
 */

const path = require( 'path' );
const { copyTemplateDir } = require( '../sync-config/copy-template-dir' );

const TEMPLATE_DIR = path.join( __dirname, '..', '..', 'vscode' );

function writeVscode( { root } ) {
	return copyTemplateDir( TEMPLATE_DIR, path.join( root, '.vscode' ) );
}

module.exports = {
	writeVscode,
};
