const {
	truncateCommentBody,
	splitMarker,
} = require( '../truncate-comment-body' );

describe( 'truncate-comment-body helper', () => {
	test( 'splitMarker returns full body as core when marker is missing', () => {
		const body = 'hello world';
		const markerRegex = /\n\nSOME_MARKER(?:\n|$)/;
		const defaultMarker = '\n\n SOME_MARKER ';

		const { core, marker } = splitMarker( body, markerRegex, defaultMarker );
		expect( core ).toBe( body );
		expect( marker ).toBe( defaultMarker );
	} );

	test( 'truncateCommentBody with title keeps title and re-appends marker/notice', () => {
		const title = '# Title';
		// Use a realistic maxChars so the helper's "budget" still includes the title.
		// When maxChars is too small, budget becomes 0 and the output intentionally drops core content.
		const body = `${ title }\n\n${ 'a'.repeat( 5000 ) }\n\n compressed-size-action `;
		const maxChars = 2000; // force truncation, but keep title in the cut
		const markerRegex = /\n\n[ \t]*compressed-size-action(?:::\S+)?[ \t]*(?:\n|$)/;
		const defaultMarker = '\n\n compressed-size-action ';
		const notice =
			'\n\n---\n_Report truncated to fit GitHub\'s 65536-character comment limit. See this workflow\'s **Size Differences** log for the full table._\n';

		const out = truncateCommentBody( {
			body,
			title,
			maxChars,
			markerRegex,
			defaultMarker,
			notice,
		} );

		expect( out ).toContain( title );
		expect( out ).toContain( 'compressed-size-action' );
		expect( out ).toContain( 'truncated to fit GitHub' );
	} );

	test( 'truncateCommentBody without title uses last-newline truncation', () => {
		const body = 'a\nb\nc\n\n blockera-theme-check ';
		const maxChars = 20; // force truncation
		const markerRegex = /\n\n[ \t]*blockera-theme-check[ \t]*(?:\n|$)/;
		const defaultMarker = '\n\n blockera-theme-check ';
		const notice =
			'\n\n---\n_Report truncated to fit GitHub\'s 65536-character comment limit. See the workflow log for full details._\n';

		const out = truncateCommentBody( {
			body,
			title: undefined,
			maxChars,
			markerRegex,
			defaultMarker,
			notice,
		} );

		expect( out ).toContain( 'blockera-theme-check' );
		expect( out ).toContain( 'truncated to fit GitHub' );
	} );
} );

