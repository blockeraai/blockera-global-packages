#!/usr/bin/env node

/**
 * Host-repo bootstrap: clean dist, materialize `.cursor` from shared templates,
 * symlink `source-codes` from BLOCKERA_EXTERNAL_SOURCE_CODES_PATH, and
 * sync-config (host files from shared templates: Flow, .cspell, .vscode).
 *
 * Run from the consuming project root:
 *   node packages/global-packages/packages/dev-tools/js/bootstrap/bootstrap-project.js --project=<id>
 */

const fs = require( 'fs' );
const path = require( 'path' );
const {
	writeFlowconfig,
	writeFlowStubs,
} = require( '../flow/write-flowconfig' );
const { writeCspell } = require( '../cspell/write-cspell' );
const { writeVscode } = require( '../vscode/write-vscode' );

const PROJECT_IDS = [
	'blockera',
	'blockera-pro',
	'blockera-one',
	'blockera-site-toolkit',
];
const FALLBACK_PROJECT_ID = 'blockera';
const LOGO_ARTS_DIR = 'logo-arts';
const SHARED_TEMPLATES = 'shared';

const ENV_SOURCE_CODES = 'BLOCKERA_EXTERNAL_SOURCE_CODES_PATH';
const ENV_SOURCE_CODES_PLACEHOLDER =
	'/absolute/path/to/shared/source-codes';
const STEP_COUNT = 4;

const useColor =
	Boolean( process.stdout.isTTY ) && process.env.NO_COLOR === undefined;

const ansi = {
	reset: 0,
	bold: 1,
	dim: 2,
	red: 31,
	green: 32,
	cyan: 36,
};

function paint( codes, text ) {
	if ( ! useColor ) {
		return text;
	}

	const seq = ( Array.isArray( codes ) ? codes : [ codes ] )
		.map( ( code ) => `\u001b[${ code }m` )
		.join( '' );

	return `${ seq }${ text }\u001b[${ ansi.reset }m`;
}

const color = {
	bold: ( text ) => paint( ansi.bold, text ),
	dim: ( text ) => paint( ansi.dim, text ),
	red: ( text ) => paint( ansi.red, text ),
	cyan: ( text ) => paint( ansi.cyan, text ),
	title: ( text ) => paint( [ ansi.bold, ansi.cyan ], text ),
	ok: ( text ) => paint( [ ansi.bold, ansi.green ], text ),
	err: ( text ) => paint( [ ansi.bold, ansi.red ], text ),
	star: ( text ) => paint( ansi.green, text ),
};

function printOut( message ) {
	// @debug-ignore — CLI stdout for project bootstrap
	console.log( message );
}

function printErr( message ) {
	// @debug-ignore — CLI stderr for project bootstrap
	console.error( message );
}

function readLogoLines( projectId ) {
	const filePath = path.join( __dirname, LOGO_ARTS_DIR, `${ projectId }.txt` );

	if ( ! fs.existsSync( filePath ) ) {
		return null;
	}

	const lines = fs
		.readFileSync( filePath, 'utf8' )
		.replace( /\r\n/g, '\n' )
		.replace( /\r/g, '\n' )
		.split( '\n' );

	while ( lines.length && lines[ lines.length - 1 ] === '' ) {
		lines.pop();
	}

	return lines.length ? lines : null;
}

function loadLogoArt( projectId ) {
	return (
		readLogoLines( projectId ) ||
		readLogoLines( FALLBACK_PROJECT_ID ) ||
		[]
	);
}

function printLogo( projectId ) {
	const art = loadLogoArt( projectId );

	if ( ! art.length ) {
		return;
	}

	printOut( '' );
	art.forEach( ( line ) => {
		printOut( line.replace( /\*/g, () => color.star( '*' ) ) );
	} );
	printOut( '' );
}

function banner( projectId ) {
	const title = 'Blockera project bootstrap';
	const meta = `project  ${ projectId }`;
	const width = Math.max( title.length, meta.length ) + 4;
	const line = '─'.repeat( width );

	printOut( '' );
	printOut( color.cyan( `  ┌${ line }┐` ) );
	printOut(
		color.cyan( '  │' ) +
			color.title( `  ${ title.padEnd( width - 2 ) }` ) +
			color.cyan( '│' )
	);
	printOut(
		color.cyan( '  │' ) +
			color.dim( `  ${ meta.padEnd( width - 2 ) }` ) +
			color.cyan( '│' )
	);
	printOut( color.cyan( `  └${ line }┘` ) );
	printOut( '' );
}

function stepLabel( index ) {
	return color.dim( `[${ index }/${ STEP_COUNT }]` );
}

function logStep( index, name, detail ) {
	printOut(
		`  ${ stepLabel( index ) }  ${ color.ok( '✔' ) }  ${ color.bold(
			name
		) }`
	);
	printOut( `           ${ color.dim( detail ) }` );
	printOut( '' );
}

function logStepWithInners( index, name, inners ) {
	printOut(
		`  ${ stepLabel( index ) }  ${ color.ok( '✔' ) }  ${ color.bold(
			name
		) }`
	);

	inners.forEach( ( inner ) => {
		printOut(
			`           ${ color.ok( '✔' ) }  ${ color.bold( inner.name ) }`
		);
		printOut( `              ${ color.dim( inner.detail ) }` );
	} );

	printOut( '' );
}

function fail( message, guide ) {
	printErr( '' );
	printErr( `  ${ color.err( '✖' ) }  ${ color.bold( 'bootstrap failed' ) }` );
	printErr( `           ${ color.red( message ) }` );

	if ( guide && guide.length ) {
		printErr( '' );
		printErr( `  ${ color.bold( 'How to fix' ) }` );

		guide.forEach( ( line, index ) => {
			const parts = String( line ).split( '\n' );

			printErr(
				`           ${ color.dim( `${ index + 1 }.` ) } ${ parts[ 0 ] }`
			);

			parts.slice( 1 ).forEach( ( extra ) => {
				printErr( `              ${ color.dim( extra ) }` );
			} );
		} );
	}

	printErr( '' );
	process.exit( 1 );
}

function parseProjectId( argv ) {
	const prefix = '--project=';
	const arg = argv.find( ( item ) => item.startsWith( prefix ) );

	if ( ! arg ) {
		fail(
			`missing --project=<id> (one of: ${ PROJECT_IDS.join( ', ' ) })`
		);
	}

	const id = arg.slice( prefix.length ).trim();

	if ( ! PROJECT_IDS.includes( id ) ) {
		fail(
			`unknown --project=${ id } (one of: ${ PROJECT_IDS.join( ', ' ) })`
		);
	}

	return id;
}

function loadEnv( envPath ) {
	const parsed = {};

	if ( ! fs.existsSync( envPath ) ) {
		return parsed;
	}

	const text = fs.readFileSync( envPath, 'utf8' );

	for ( const rawLine of text.split( /\r?\n/ ) ) {
		const line = rawLine.trim();

		if ( ! line || line.startsWith( '#' ) ) {
			continue;
		}

		const eq = line.indexOf( '=' );

		if ( eq === -1 ) {
			continue;
		}

		const key = line.slice( 0, eq ).trim();
		let value = line.slice( eq + 1 ).trim();

		if (
			( value.startsWith( '"' ) && value.endsWith( '"' ) ) ||
			( value.startsWith( "'" ) && value.endsWith( "'" ) )
		) {
			value = value.slice( 1, -1 );
		}

		parsed[ key ] = value;
	}

	return parsed;
}

function skipGitkeep( src ) {
	return path.basename( src ) !== '.gitkeep';
}

function copyTemplateTree( fromDir, toDir ) {
	if ( ! fs.existsSync( fromDir ) ) {
		fail( `template folder missing: ${ fromDir }` );
	}

	fs.cpSync( fromDir, toDir, {
		recursive: true,
		filter: skipGitkeep,
	} );
}

function cleanDist( root ) {
	const dist = path.join( root, 'dist' );
	fs.rmSync( dist, { recursive: true, force: true } );
	logStep( 1, 'dist', 'removed dist/' );
}

function bootstrapCursor( root, projectId ) {
	const templatesRoot = path.join( __dirname, '..', '..', 'cursor' );
	const sharedDir = path.join( templatesRoot, SHARED_TEMPLATES );
	const overlayDir = path.join( templatesRoot, projectId );
	const cursorDir = path.join( root, '.cursor' );

	fs.rmSync( cursorDir, { recursive: true, force: true } );
	fs.mkdirSync( cursorDir, { recursive: true } );

	copyTemplateTree( sharedDir, cursorDir );

	if ( fs.existsSync( overlayDir ) ) {
		copyTemplateTree( overlayDir, cursorDir );
		logStep(
			2,
			'.cursor',
			`copied shared templates + ${ projectId } overlay`
		);
		return;
	}

	logStep( 2, '.cursor', 'copied shared templates' );
}

function sourceCodesGuide() {
	return [
		`Copy .env.example to .env if this project has no .env yet.`,
		`Add this line to .env (absolute path, not the placeholder):\n${ ENV_SOURCE_CODES }=${ ENV_SOURCE_CODES_PLACEHOLDER }`,
		`Point it at the shared clones folder (block-editor, wordpress, woocommerce, …).`,
		`Run npm run project:bootstrap again (or npm run start).`,
	];
}

function bootstrapSourceCodes( root, env ) {
	const raw = ( env[ ENV_SOURCE_CODES ] || '' ).trim();
	const target = path.resolve( raw );

	if ( ! fs.existsSync( target ) ) {
		fail( `${ ENV_SOURCE_CODES } does not exist: ${ target }`, [
			`Open .env in the project root.`,
			`Set ${ ENV_SOURCE_CODES } to a folder that exists on this machine.`,
			`That folder should contain the shared clones (block-editor, wordpress, woocommerce, …).`,
			`Run npm run project:bootstrap again (or npm run start).`,
		] );
	}

	const linkPath = path.join( root, 'source-codes' );

	fs.rmSync( linkPath, { recursive: true, force: true } );
	fs.symlinkSync( target, linkPath, 'dir' );
	logStep( 3, 'source-codes', `linked → ${ target }` );
}

function syncFlowconfig( root, projectId ) {
	writeFlowconfig( { root, projectId } );
	writeFlowStubs( { root } );

	return [
		{
			name: '.flowconfig',
			detail: `wrote from flow/flowconfig.base + overlays/${ projectId }`,
		},
		{
			name: 'flow/',
			detail: 'copied TypeScriptModule.js.flow, WebpackAsset.js.flow',
		},
	];
}

function syncCspell( root ) {
	writeCspell( { root } );

	return {
		name: '.cspell/',
		detail: 'copied words.txt',
	};
}

function syncVscode( root ) {
	writeVscode( { root } );

	return {
		name: '.vscode/',
		detail: 'copied settings.json, extensions.json, tasks.json',
	};
}

function bootstrapSyncConfig( root, projectId ) {
	const inners = [];

	try {
		inners.push( ...syncFlowconfig( root, projectId ) );
		inners.push( syncCspell( root ) );
		inners.push( syncVscode( root ) );
	} catch ( error ) {
		fail( error.message || String( error ) );
	}

	logStepWithInners( 4, 'sync-config', inners );
}

function done() {
	printOut( `  ${ color.ok( '✔' ) }  ${ color.bold( 'bootstrap complete' ) }` );
	printOut( '' );
}

function main() {
	const projectId = parseProjectId( process.argv.slice( 2 ) );
	const root = process.cwd();
	const env = loadEnv( path.join( root, '.env' ) );
	const raw = ( env[ ENV_SOURCE_CODES ] || '' ).trim();

	printLogo( projectId );
	banner( projectId );

	if ( ! raw || raw === ENV_SOURCE_CODES_PLACEHOLDER ) {
		fail(
			`${ ENV_SOURCE_CODES } is not set in .env`,
			sourceCodesGuide()
		);
	}

	cleanDist( root );
	bootstrapCursor( root, projectId );
	bootstrapSourceCodes( root, env );
	bootstrapSyncConfig( root, projectId );
	done();
}

main();
