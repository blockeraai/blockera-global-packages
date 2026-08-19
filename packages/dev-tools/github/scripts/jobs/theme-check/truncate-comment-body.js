/**
 * Fit a theme-check report into GitHub's issue-comment body limit (65536 chars).
 *
 * @param {string} body
 * @param {number} maxChars
 * @return {string}
 */
const { splitMarker: splitMarkerBase, truncateCommentBody: truncateBase } = require( '../../lib/truncate-comment-body' );

const MARKER_RE = /\n\n[ \t]*blockera-theme-check[ \t]*(?:\n|$)/;
const DEFAULT_MARKER = '\n\n blockera-theme-check ';

const NOTICE =
	'\n\n---\n_Report truncated to fit GitHub\'s 65536-character comment limit. See the workflow log for full details._\n';

function splitMarker( body ) {
	return splitMarkerBase( body, MARKER_RE, DEFAULT_MARKER );
}

function truncateCommentBody(
	body,
	maxChars = Number( process.env.BLOCKERA_THEME_CHECK_MAX_COMMENT_CHARS || 64000 )
) {
	return truncateBase( {
		body,
		title: undefined,
		maxChars,
		markerRegex: MARKER_RE,
		defaultMarker: DEFAULT_MARKER,
		notice: NOTICE,
	} );
}

module.exports = { truncateCommentBody, splitMarker };

if (require.main === module) {
	const fs = require('fs');
	const maxChars = Number(process.argv[2] || 64000);
	const input = fs.readFileSync(0, 'utf8');
	process.stdout.write(truncateCommentBody(input, maxChars));
}
