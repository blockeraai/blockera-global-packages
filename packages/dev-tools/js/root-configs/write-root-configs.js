/**
 * Copy host configs from `root-configs/` (mirrors the host tree).
 * Replaces `{{PROJECT_ID}}` when present. Husky hook scripts get chmod 0755.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { copyTemplateDir } = require( '../sync-config/copy-template-dir' );
const { copyTemplateFile } = require( '../sync-config/copy-template-file' );

const TEMPLATE_DIR = path.join( __dirname, '..', '..', 'root-configs' );
const PROJECT_ID_TOKEN = '{{PROJECT_ID}}';
const HOOK_MODE = 0o755;

const ROOT_CONFIGS = [
	{ dest: '.browserslistrc' },
	{ dest: '.cspell', kind: 'dir' },
	{ dest: '.flowconfig' },
	{ dest: 'flow', kind: 'dir' },
	{ dest: '.gitattributes' },
	{ dest: '.husky', kind: 'husky' },
	{ dest: '.nvmrc' },
	{ dest: '.pr-workflows.example.json' },
	{ dest: '.prettierignore' },
	{ dest: '.prettierrc.js' },
	{ dest: '.stylelintrc.js' },
	{ dest: '.vscode', kind: 'dir' },
	{ dest: 'babel.config.js' },
	{ dest: 'cypress/support/component-index.html' },
	{ dest: 'cypress-image-diff.config.js' },
	{ dest: 'phpcs.xml' },
	{ dest: 'phpstan.neon' },
	{ dest: 'svgo.config.js' },
	{ dest: 'tsconfig.json', src: 'tsconfig.json.template' },
];

function writeConfigFile( root, dest, projectId, src ) {
	const from = path.join( TEMPLATE_DIR, src || dest );
	const to = path.join( root, dest );

	if ( ! fs.existsSync( from ) ) {
		throw new Error( `missing template file: ${ from }` );
	}

	const content = fs.readFileSync( from, 'utf8' );

	if ( ! content.includes( PROJECT_ID_TOKEN ) ) {
		return copyTemplateFile( from, to );
	}

	if ( ! projectId ) {
		throw new Error(
			`root-configs/${ dest } needs --project to replace ${ PROJECT_ID_TOKEN }`
		);
	}

	fs.mkdirSync( path.dirname( to ), { recursive: true } );
	fs.writeFileSync( to, content.split( PROJECT_ID_TOKEN ).join( projectId ) );

	return to;
}

function writeHusky( root ) {
	const fromDir = path.join( TEMPLATE_DIR, '.husky' );
	const dest = path.join( root, '.husky' );
	const huskySh = path.join( fromDir, 'internals', 'husky.sh' );

	if ( ! fs.existsSync( huskySh ) ) {
		throw new Error( `missing Husky template: ${ huskySh }` );
	}

	fs.rmSync( dest, { recursive: true, force: true } );
	fs.mkdirSync( dest, { recursive: true } );

	for ( const name of fs.readdirSync( fromDir ) ) {
		if ( name === 'internals' || name.startsWith( '.' ) ) {
			continue;
		}

		const from = path.join( fromDir, name );

		if ( ! fs.statSync( from ).isFile() ) {
			continue;
		}

		const to = path.join( dest, name );

		fs.copyFileSync( from, to );
		fs.chmodSync( to, HOOK_MODE );
	}

	const internalsDir = path.join( dest, '_' );

	fs.mkdirSync( internalsDir, { recursive: true } );
	fs.writeFileSync( path.join( internalsDir, '.gitignore' ), '*\n' );
	fs.copyFileSync( huskySh, path.join( internalsDir, 'husky.sh' ) );

	return dest;
}

function entryName( entry ) {
	if ( entry.kind === 'dir' || entry.kind === 'husky' ) {
		return `${ entry.dest }/`;
	}

	return entry.dest;
}

function entryDetail( entry ) {
	if ( entry.kind === 'husky' ) {
		return 'copied hooks + _/ and chmod 0755 hook scripts';
	}

	if ( entry.kind === 'dir' ) {
		return `copied from root-configs/${ entry.dest }/`;
	}

	return `copied from root-configs/${ entry.src || entry.dest }`;
}

function writeRootConfigs( { root, projectId } ) {
	return ROOT_CONFIGS.map( ( entry ) => {
		if ( entry.kind === 'dir' ) {
			copyTemplateDir(
				path.join( TEMPLATE_DIR, entry.dest ),
				path.join( root, entry.dest )
			);
		} else if ( entry.kind === 'husky' ) {
			writeHusky( root );
		} else {
			writeConfigFile( root, entry.dest, projectId, entry.src );
		}

		return {
			name: entryName( entry ),
			detail: entryDetail( entry ),
		};
	} );
}

module.exports = {
	PROJECT_ID_TOKEN,
	ROOT_CONFIGS,
	writeRootConfigs,
};
