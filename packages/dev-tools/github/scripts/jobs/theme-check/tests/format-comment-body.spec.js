const fs = require('fs');
const os = require('os');
const path = require('path');

const { formatCommentBody, MARKER } = require('../format-comment-body');
const { truncateCommentBody } = require('../truncate-comment-body');

describe( 'formatCommentBody', () => {
	let tmpDir;

	function writeLog(relativePath, contents = '' ) {
		const fullPath = path.join( tmpDir, relativePath );
		fs.mkdirSync( path.dirname( fullPath ), { recursive: true } );
		fs.writeFileSync( fullPath, contents );
	}

	beforeEach( () => {
		tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'theme-check-comment-' ) );
	} );

	afterEach( () => {
		fs.rmSync( tmpDir, { recursive: true, force: true } );
	} );

	test( 'reports passed when all log files are empty', () => {
		writeLog( 'structure-check-errors.txt', '' );
		writeLog( 'structure-check-warnings.txt', '' );
		writeLog( 'theme-check/errors.txt', '' );
		writeLog( 'theme-check/warnings.txt', '' );
		writeLog( 'ui-check-errors.txt', '' );
		writeLog( 'ui-check-warnings.txt', '' );

		const body = formatCommentBody( tmpDir, {
			runUrl: 'https://example.com/run/1',
		} );

		expect( body ).toMatch( /✅ \\*\\*Passed\\*\\*/ );
		expect( body ).toMatch( /\\[View workflow run\\]\\(https:\\/\\/example\\.com\\/run\\/1\\)/ );
		expect( body ).toContain( 'blockera-theme-check' );
	} );

	test( 'reports failed when errors exist', () => {
		writeLog( 'structure-check-errors.txt', 'Missing screenshot.png' );
		writeLog( 'structure-check-warnings.txt', '' );
		writeLog( 'theme-check/errors.txt', '' );
		writeLog( 'theme-check/warnings.txt', '' );
		writeLog( 'ui-check-errors.txt', '' );
		writeLog( 'ui-check-warnings.txt', '' );

		const body = formatCommentBody( tmpDir );

		expect( body ).toMatch( /❌ \\*\\*Failed\\*\\*/ );
		expect( body ).toContain( 'Missing screenshot.png' );
	} );

	test( 'handles missing logs directory', () => {
		const body = formatCommentBody( '/path/does/not/exist' );

		expect( body ).toMatch( /Incomplete/ );
		expect( body ).toContain( MARKER.trim() );
	} );
} );

describe( 'truncateCommentBody', () => {
	test( 'preserves marker when under limit', () => {
		const body = '# Title\\n\\nHello\\n\\n blockera-theme-check ';
		expect( truncateCommentBody( body, 1000 ) ).toBe( body );
	} );

	test( 'truncates oversized reports and keeps marker', () => {
		const body = `# Title\\n\\n${ 'x'.repeat( 70000 ) }\\n\\n blockera-theme-check `;
		const next = truncateCommentBody( body, 64000 );

		expect( next.length ).toBeLessThanOrEqual( 64000 );
		expect( next ).toContain( 'blockera-theme-check' );
		expect( next ).toMatch( /truncated/i );
	} );
} );

