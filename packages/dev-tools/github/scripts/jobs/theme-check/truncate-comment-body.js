/**
 * Fit a theme-check report into GitHub's issue-comment body limit (65536 chars).
 *
 * @param {string} body
 * @param {number} maxChars
 * @return {string}
 */
const MARKER_RE = /\n\n[ \t]*blockera-theme-check[ \t]*(?:\n|$)/;
const DEFAULT_MARKER = '\n\n blockera-theme-check ';

function splitMarker(body) {
	const text = body || '';
	const match = text.match(MARKER_RE);
	if (!match || match.index === undefined) {
		return { core: text, marker: DEFAULT_MARKER };
	}

	return {
		core: text.slice(0, match.index),
		marker: match[0].startsWith('\n') ? match[0] : `\n\n${match[0]}`,
	};
}

function truncateCommentBody(
	body,
	maxChars = Number(process.env.BLOCKERA_THEME_CHECK_MAX_COMMENT_CHARS || 64000)
) {
	const notice =
		'\n\n---\n_Report truncated to fit GitHub\'s 65536-character comment limit. See the workflow log for full details._\n';
	const { core, marker } = splitMarker(body);

	if (core.length + marker.length <= maxChars) {
		return `${core}${marker}`;
	}

	const budget = Math.max(0, maxChars - notice.length - marker.length);
	let cut = core.slice(0, budget);
	const lastNewline = cut.lastIndexOf('\n');
	if (lastNewline > 0) {
		cut = cut.slice(0, lastNewline);
	}

	return `${cut}${notice}${marker}`;
}

module.exports = { truncateCommentBody, splitMarker };

if (require.main === module) {
	const fs = require('fs');
	const maxChars = Number(process.argv[2] || 64000);
	const input = fs.readFileSync(0, 'utf8');
	process.stdout.write(truncateCommentBody(input, maxChars));
}
