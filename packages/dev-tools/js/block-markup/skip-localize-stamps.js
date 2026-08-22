/**
 * Skip i18n wrapping for Gutenberg blocks identified by blockeraOne stamps.
 *
 * Markup stores `role/id:variant` (e.g. `container/meta-separator:default`).
 * The skip list uses the stamp id (`meta-separator`), the dictionary form
 * (`container/meta-separator`), or a full stamp. Same grammar as theme
 * `parseStamp` (`role/id` with optional `:variant`).
 */

const STAMP_SHAPE =
	/^(layout|section|area|container)\/([a-z0-9-]+)(?::([a-z0-9-]+))?$/;

/**
 * @param {Object} [localize] Resolved localize config.
 * @return {string[]} Stamp ids that skip text localization.
 */
function getSkipLocalizeStamps(localize) {
	if (!localize || localize.enabled === false) {
		return [];
	}

	const section = localize.skipStamps;

	if (!section || section.enabled === false) {
		return [];
	}

	return Array.isArray(section.stamps) ? section.stamps.filter(Boolean) : [];
}

/**
 * @param {string} commentText parse5 comment body (no `<!-- -->`).
 * @return {string} `blockeraOne` stamp or empty string.
 */
function extractBlockeraOneStamp(commentText) {
	if (!commentText) {
		return '';
	}

	const match = commentText.match(
		/["']blockeraOne["']\s*:\s*["']([^"']*)["']/
	);

	return match ? match[1] : '';
}

/**
 * @param {string} stamp Full stamp (`container/meta-separator:default`).
 * @param {string[]} skipStamps Stamp ids, `role/id`, or full stamps.
 * @return {boolean} True when this block's inner HTML should not be wrapped.
 */
function isSkipLocalizeStamp(stamp, skipStamps) {
	if (!stamp || !Array.isArray(skipStamps) || skipStamps.length === 0) {
		return false;
	}

	if (skipStamps.indexOf(stamp) !== -1) {
		return true;
	}

	const parsed = STAMP_SHAPE.exec(stamp);

	if (!parsed) {
		return false;
	}

	const roleId = `${parsed[1]}/${parsed[2]}`;

	return (
		skipStamps.indexOf(roleId) !== -1 || skipStamps.indexOf(parsed[2]) !== -1
	);
}

/**
 * @param {string} commentText parse5 comment body.
 * @param {string[]} skipStamps Stamp ids that skip localization.
 * @return {{ closer: boolean, selfClosing?: boolean, skipText?: boolean }|null}
 */
function parseGutenbergComment(commentText, skipStamps) {
	const body = commentText && commentText.trim();

	if (!body) {
		return null;
	}

	if (body.startsWith('/wp:')) {
		return { closer: true };
	}

	if (!body.startsWith('wp:')) {
		return null;
	}

	return {
		closer: false,
		selfClosing: /\/$/.test(body),
		skipText: isSkipLocalizeStamp(
			extractBlockeraOneStamp(body),
			skipStamps
		),
	};
}

module.exports = {
	extractBlockeraOneStamp,
	getSkipLocalizeStamps,
	isSkipLocalizeStamp,
	parseGutenbergComment,
};
