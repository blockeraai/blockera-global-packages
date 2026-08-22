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

		expect( body ).toContain( '✅ **Passed**' );
		expect( body ).toContain( '| Structure check | 0 | 0 |' );
		expect( body ).toContain( '| Theme Check plugin | 0 | 0 |' );
		expect( body ).toContain( '| UI & accessibility | 0 | 0 |' );
		expect( body ).not.toContain( '## Structure check' );
		expect( body ).not.toContain( '## Theme Check plugin' );
		expect( body ).not.toContain( '## UI & accessibility' );
		expect( body ).not.toContain( '_none_' );
		expect( body ).toContain( '[View workflow run](https://example.com/run/1)' );
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

		expect( body ).toContain( '❌ **Failed**' );
		expect( body ).toContain( '## Structure check' );
		expect( body ).toContain( '### Errors' );
		expect( body ).toContain( 'Missing screenshot.png' );
		expect( body ).not.toContain( '### Warnings' );
		expect( body ).not.toContain( '## Theme Check plugin' );
		expect( body ).not.toContain( '## UI & accessibility' );
		expect( body ).not.toContain( '_none_' );
	} );

	test( 'includes detail only for sections with warnings', () => {
		writeLog( 'structure-check-errors.txt', '' );
		writeLog( 'structure-check-warnings.txt', '' );
		writeLog( 'theme-check/errors.txt', '' );
		writeLog( 'theme-check/warnings.txt', 'Avoid hard-coded colors' );
		writeLog( 'ui-check-errors.txt', '' );
		writeLog( 'ui-check-warnings.txt', '' );

		const body = formatCommentBody( tmpDir );

		expect( body ).toContain( '⚠️ **Passed with warnings**' );
		expect( body ).toContain( '| Theme Check plugin | 0 | 1 |' );
		expect( body ).toContain( '## Theme Check plugin' );
		expect( body ).toContain( '### Warnings' );
		expect( body ).toContain( 'Avoid hard-coded colors' );
		expect( body ).not.toContain( '### Errors' );
		expect( body ).not.toContain( '## Structure check' );
		expect( body ).not.toContain( '## UI & accessibility' );
	} );

	test( 'handles missing logs directory', () => {
		const body = formatCommentBody( '/path/does/not/exist' );

		expect( body ).toMatch( /Incomplete/ );
		expect( body ).toContain( MARKER.trim() );
	} );
} );

describe( 'truncateCommentBody', () => {
	test( 'preserves marker when under limit', () => {
		const body = '# Title\n\nHello\n\n blockera-theme-check ';
		expect( truncateCommentBody( body, 1000 ) ).toBe( body );
	} );

	test( 'truncates oversized reports and keeps marker', () => {
		const body = `# Title\n\n${ 'x'.repeat( 70000 ) }\n\n blockera-theme-check `;
		const next = truncateCommentBody( body, 64000 );

		expect( next.length ).toBeLessThanOrEqual( 64000 );
		expect( next ).toContain( 'blockera-theme-check' );
		expect( next ).toMatch( /truncated/i );
	} );
} );

