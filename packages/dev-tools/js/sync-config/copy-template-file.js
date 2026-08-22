const fs = require( 'fs' );
const path = require( 'path' );

function copyTemplateFile( fromFile, toFile ) {
	if ( ! fs.existsSync( fromFile ) ) {
		throw new Error( `missing template file: ${ fromFile }` );
	}

	fs.mkdirSync( path.dirname( toFile ), { recursive: true } );
	fs.copyFileSync( fromFile, toFile );

	return toFile;
}

module.exports = {
	copyTemplateFile,
};
