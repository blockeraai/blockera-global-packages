/**
 * Fit a titled bundle-size report into GitHub's issue-comment body limit
 * (65536 characters). Keep the H1, totals/changed rows at the top, and the
 * compressed-size-action marker at the end; cut remaining table rows.
 *
 * @param {string} title
 * @param {string} body
 * @param {number} maxChars
 * @return {string}
 */
const { splitMarker: splitMarkerBase, truncateCommentBody: truncateBase } = require( '../../lib/truncate-comment-body' );

const MARKER_RE =
	/\n\n[ \t]*compressed-size-action(?:::\S+)?[ \t]*(?:\n|$)/;

const DEFAULT_MARKER = '\n\n compressed-size-action ';

const NOTICE =
	'\n\n---\n_Report truncated to fit GitHub\'s 65536-character comment limit. See this workflow\'s **Size Differences** log for the full table._\n';

function splitMarker( body ) {
	return splitMarkerBase( body, MARKER_RE, DEFAULT_MARKER );
}

function truncateCommentBody(
	title,
	body,
	maxChars = Number( process.env.BLOCKERA_BUNDLE_SIZE_MAX_COMMENT_CHARS || 64000 )
) {
	return truncateBase( {
		body,
		title,
		maxChars,
		markerRegex: MARKER_RE,
		defaultMarker: DEFAULT_MARKER,
		notice: NOTICE,
	} );
}

module.exports = { truncateCommentBody, splitMarker };

if (require.main === module) {
	const fs = require('fs');
	const title = process.argv[2] || '';
	const maxChars = Number(process.argv[3] || 64000);
	const input = fs.readFileSync(0, 'utf8');
	process.stdout.write(truncateCommentBody(title, input, maxChars));
}
