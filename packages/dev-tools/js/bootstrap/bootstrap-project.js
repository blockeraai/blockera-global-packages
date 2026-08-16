#!/usr/bin/env node

/**
 * Host-repo bootstrap: clean dist, materialize `.cursor` from shared templates,
 * and symlink `source-codes` from BLOCKERA_EXTERNAL_SOURCE_CODES_PATH.
 *
 * Run from the consuming project root:
 *   node packages/global-packages/packages/dev-tools/js/bootstrap/bootstrap-project.js --project=<id>
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PROJECT_IDS = [
	'blockera',
	'blockera-pro',
	'blockera-one',
	'blockera-site-toolkit',
];
const SHARED_TEMPLATES = 'shared';

const ENV_SOURCE_CODES = 'BLOCKERA_EXTERNAL_SOURCE_CODES_PATH';
const ENV_SOURCE_CODES_PLACEHOLDER =
	'/absolute/path/to/shared/source-codes';
const STEP_COUNT = 3;

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

function printLogo() {
	const art = [
		'***********************************************************',
		'*                                                         *',
		'*  ____    _                  _                           *',
		'* |  _ \\  | |                | |                          *',
		'* | |_) | | |   ___     ___  | | __   ___   _ __    __ _  *',
		'* |  _ <  | |  / _ \\   / __| | |/ /  / _ \\ | \'__|  / _` | *',
		'* | |_) | | | | (_) | | (__  |   <  |  __/ | |    | (_| | *',
		'* |____/  |_|  \\___/   \\___| |_|\\_\\  \\___| |_|     \\__,_| *',
		'*                                                         *',
		'***********************************************************',
	];

	console.log( '' );
	art.forEach( ( line ) => {
		console.log( line.replace( /\*/g, () => color.star( '*' ) ) );
	} );
	console.log( '' );
}

function banner( projectId ) {
	const title = 'Blockera project bootstrap';
	const meta = `project  ${ projectId }`;
	const width = Math.max( title.length, meta.length ) + 4;
	const line = '─'.repeat( width );

	console.log( '' );
	console.log( color.cyan( `  ┌${ line }┐` ) );
	console.log(
		color.cyan( '  │' ) +
			color.title( `  ${ title.padEnd( width - 2 ) }` ) +
			color.cyan( '│' )
	);
	console.log(
		color.cyan( '  │' ) +
			color.dim( `  ${ meta.padEnd( width - 2 ) }` ) +
			color.cyan( '│' )
	);
	console.log( color.cyan( `  └${ line }┘` ) );
	console.log( '' );
}

function stepLabel( index ) {
	return color.dim( `[${ index }/${ STEP_COUNT }]` );
}

function logStep( index, name, detail ) {
	console.log(
		`  ${ stepLabel( index ) }  ${ color.ok( '✔' ) }  ${ color.bold(
			name
		) }`
	);
	console.log( `           ${ color.dim( detail ) }` );
	console.log( '' );
}

function fail( message, guide ) {
	console.error( '' );
	console.error(
		`  ${ color.err( '✖' ) }  ${ color.bold( 'bootstrap failed' ) }`
	);
	console.error( `           ${ color.red( message ) }` );

	if ( guide && guide.length ) {
		console.error( '' );
		console.error( `  ${ color.bold( 'How to fix' ) }` );

		guide.forEach( ( line, index ) => {
			const parts = String( line ).split( '\n' );

			console.error(
				`           ${ color.dim( `${ index + 1 }.` ) } ${ parts[ 0 ] }`
			);

			parts.slice( 1 ).forEach( ( extra ) => {
				console.error( `              ${ color.dim( extra ) }` );
			} );
		} );
	}

	console.error( '' );
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
	const out = {};

	if ( ! fs.existsSync( envPath ) ) {
		return out;
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

		out[ key ] = value;
	}

	return out;
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

function done() {
	console.log( `  ${ color.ok( '✔' ) }  ${ color.bold( 'bootstrap complete' ) }` );
	console.log( '' );
}

function main() {
	printLogo();

	const projectId = parseProjectId( process.argv.slice( 2 ) );
	const root = process.cwd();
	const env = loadEnv( path.join( root, '.env' ) );
	const raw = ( env[ ENV_SOURCE_CODES ] || '' ).trim();

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
	done();
}

main();
