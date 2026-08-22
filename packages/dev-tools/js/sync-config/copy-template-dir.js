const fs = require( 'fs' );
const path = require( 'path' );

function skipGitkeep( src ) {
	return path.basename( src ) !== '.gitkeep';
}

function copyTemplateDir( fromDir, toDir ) {
	if ( ! fs.existsSync( fromDir ) ) {
		throw new Error( `missing template folder: ${ fromDir }` );
	}

	fs.rmSync( toDir, { recursive: true, force: true } );
	fs.mkdirSync( toDir, { recursive: true } );
	fs.cpSync( fromDir, toDir, {
		recursive: true,
		filter: skipGitkeep,
	} );

	return toDir;
}

module.exports = {
	copyTemplateDir,
};
