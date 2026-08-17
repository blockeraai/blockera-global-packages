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
const MARKER_RE =
	/\n\n[ \t]*compressed-size-action(?:::\S+)?[ \t]*(?:\n|$)/;

const DEFAULT_MARKER = '\n\n compressed-size-action ';

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
	title,
	body,
	maxChars = Number(process.env.BLOCKERA_BUNDLE_SIZE_MAX_COMMENT_CHARS || 64000)
) {
	const notice =
		'\n\n---\n_Report truncated to fit GitHub\'s 65536-character comment limit. See this workflow\'s **Size Differences** log for the full table._\n';

	const { core, marker } = splitMarker(body);
	let next = core;
	if (title && !next.startsWith(title)) {
		next = `${title}\n\n${next}`;
	}

	if (next.length + marker.length <= maxChars) {
		return `${next}${marker}`;
	}

	const budget = Math.max(0, maxChars - notice.length - marker.length);
	let cut = next.slice(0, budget);
	const lastNewline = cut.lastIndexOf('\n');
	if (lastNewline > title.length + 2) {
		cut = cut.slice(0, lastNewline);
	}

	return `${cut}${notice}${marker}`;
}

module.exports = { truncateCommentBody, splitMarker };

if (require.main === module) {
	const fs = require('fs');
	const title = process.argv[2] || '';
	const maxChars = Number(process.argv[3] || 64000);
	const input = fs.readFileSync(0, 'utf8');
	process.stdout.write(truncateCommentBody(title, input, maxChars));
}
