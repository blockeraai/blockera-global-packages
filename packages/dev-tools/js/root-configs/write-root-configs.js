/**
 * Copy host configs from `root-configs/` (mirrors the host tree).
 * Replaces `{{PROJECT_ID}}` when present. Husky hook scripts get chmod 0755.
 * Optional `projects` on an entry limits the copy to those `--project` ids.
 * `kind: 'gitignore'` writes shared `.gitignore`, then prepends `.gitignore.<project>` when present.
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
	{ dest: '.editorconfig', src: '../editorconfig' },
	{ dest: '.env.example' },
	{
		dest: '.env.example',
		src: '.env.example.blockera-pro',
		projects: [ 'blockera-pro' ],
	},
	{
		dest: '.env.example',
		src: '.env.example.blockera-site-toolkit',
		projects: [ 'blockera-site-toolkit' ],
	},
	{ dest: '.eslintrc.js' },
	{
		dest: '.eslintrc.js',
		src: '.eslintrc.blockera-one.js',
		projects: [ 'blockera-one' ],
	},
	{
		dest: '.eslintrc.js',
		src: '.eslintrc.blockera-pro.js',
		projects: [ 'blockera-pro' ],
	},
	{
		dest: '.eslintrc.js',
		src: '.eslintrc.blockera-site-toolkit.js',
		projects: [ 'blockera-site-toolkit' ],
	},
	{ dest: '.flowconfig' },
	{ dest: 'flow', kind: 'dir' },
	{ dest: '.gitattributes' },
	{ dest: '.gitignore', kind: 'gitignore' },
	{ dest: '.husky', kind: 'husky' },
	{ dest: '.nvmrc' },
	{ dest: '.pr-cypress.env-example.json' },
	{ dest: '.pr-env.example.json', projects: [ 'blockera-one' ] },
	{ dest: '.pr-playwright.env-example.json' },
	{ dest: '.pr-workflows.example.json' },
	{ dest: '.prettierignore' },
	{ dest: '.prettierrc.js' },
	{ dest: '.stylelintrc.js' },
	{ dest: '.vscode', kind: 'dir' },
	{ dest: 'babel.config.js' },
	{ dest: 'cypress/support/component-index.html' },
	{ dest: 'cypress-image-diff.config.js' },
	{ dest: 'cypress.config.js' },
	{
		dest: 'cypress.config.js',
		src: 'cypress.config.blockera-one.js',
		projects: [ 'blockera-one' ],
	},
	{
		dest: 'cypress.config.js',
		src: 'cypress.config.blockera-site-toolkit.js',
		projects: [ 'blockera-site-toolkit' ],
	},
	{ dest: 'cypress.env-example.json' },
	{
		dest: 'cypress.env-example.json',
		src: 'cypress.env-example.simple.json',
		projects: [ 'blockera-pro', 'blockera-site-toolkit' ],
	},
	{ dest: 'phpcs.xml' },
	{ dest: 'phpstan.neon' },
	{ dest: 'playwright.config.js' },
	{ dest: 'playwright.env.example.json' },
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

function ensureTrailingNewline( text ) {
	return text.endsWith( '\n' ) ? text : `${ text }\n`;
}

function gitignoreOverlaySrc( projectId ) {
	return `.gitignore.${ projectId }`;
}

function writeGitignore( root, projectId ) {
	const sharedFrom = path.join( TEMPLATE_DIR, '.gitignore' );
	const to = path.join( root, '.gitignore' );

	if ( ! fs.existsSync( sharedFrom ) ) {
		throw new Error( `missing template file: ${ sharedFrom }` );
	}

	const sharedBody = fs
		.readFileSync( sharedFrom, 'utf8' )
		.replace( /^\uFEFF/, '' )
		.replace( /^\n+/, '' );
	const overlayFrom = projectId
		? path.join( TEMPLATE_DIR, gitignoreOverlaySrc( projectId ) )
		: '';
	const hasOverlay = Boolean( overlayFrom && fs.existsSync( overlayFrom ) );

	let content;

	if ( hasOverlay ) {
		const overlayBody = fs
			.readFileSync( overlayFrom, 'utf8' )
			.replace( /^\uFEFF/, '' )
			.replace( /^\n+/, '' );

		content = [
			`# Edit packages/global-packages/packages/dev-tools/root-configs/${ gitignoreOverlaySrc( projectId ) }`,
			'# project:bootstrap prepends these extras, then the shared gitignore.',
			'',
			overlayBody.trimEnd(),
			'',
			'# Shared gitignore — edit packages/global-packages/packages/dev-tools/root-configs/.gitignore',
			'# project:bootstrap copies this section to every product.',
			'',
			sharedBody.trimEnd(),
			'',
		].join( '\n' );
	} else {
		content = [
			'# Edit packages/global-packages/packages/dev-tools/root-configs/.gitignore',
			'# project:bootstrap copies this to the host repo root.',
			'',
			sharedBody.trimEnd(),
			'',
		].join( '\n' );
	}

	fs.mkdirSync( path.dirname( to ), { recursive: true } );
	fs.writeFileSync( to, ensureTrailingNewline( content ) );

	return hasOverlay
		? `shared + root-configs/${ gitignoreOverlaySrc( projectId ) }`
		: 'copied from root-configs/.gitignore';
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

	if ( entry.kind === 'gitignore' ) {
		return 'shared gitignore (product extras prepended when present)';
	}

	return `copied from root-configs/${ entry.src || entry.dest }`;
}

function matchesProject( entry, projectId ) {
	if ( ! entry.projects ) {
		return true;
	}

	return Boolean( projectId ) && entry.projects.includes( projectId );
}

function writeRootConfigs( { root, projectId } ) {
	return ROOT_CONFIGS.filter( ( entry ) =>
		matchesProject( entry, projectId )
	).map( ( entry ) => {
		if ( entry.kind === 'dir' ) {
			copyTemplateDir(
				path.join( TEMPLATE_DIR, entry.dest ),
				path.join( root, entry.dest )
			);
		} else if ( entry.kind === 'husky' ) {
			writeHusky( root );
		} else if ( entry.kind === 'gitignore' ) {
			return {
				name: entryName( entry ),
				detail: writeGitignore( root, projectId ),
			};
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
