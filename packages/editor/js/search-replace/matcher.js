/**
 * Build a global regex for find / replace options.
 *
 * @package
 */

const MAX_MATCHES_PER_STRING = 500;
const WORD_CHAR = '[A-Za-z0-9_]';

/**
 * @param {string} value
 * @return {string}
 */
export function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} source
 * @return {string}
 */
function wrapWholeWord(source) {
	return `(?<!${WORD_CHAR})(?:${source})(?!${WORD_CHAR})`;
}

/**
 * @param {{ query: string, matchCase?: boolean, wholeWord?: boolean, useRegex?: boolean }} options
 * @return {RegExp|null}
 */
export function buildMatcher(options) {
	const query = options?.query;
	if (!query || typeof query !== 'string') {
		return null;
	}

	try {
		let source = options.useRegex ? query : escapeRegExp(query);

		if (options.wholeWord) {
			source = wrapWholeWord(source);
		}

		const flags = options.matchCase ? 'g' : 'gi';
		return new RegExp(source, flags);
	} catch {
		return null;
	}
}

/**
 * Apply a replacement string to one matched snippet.
 * Regex mode honors `$1` / `$&` substitutions; literal search does not.
 *
 * @param {string} matchText
 * @param {{ query: string, matchCase?: boolean, wholeWord?: boolean, useRegex?: boolean }} options
 * @param {string} replacement
 * @return {string}
 */
export function applyReplacement(matchText, options, replacement) {
	const next = replacement ?? '';

	if (!options?.useRegex || typeof matchText !== 'string') {
		return next;
	}

	const matcher = buildMatcher(options);
	if (!matcher) {
		return next;
	}

	try {
		const flags = matcher.flags.replace(/g/g, '');
		return matchText.replace(new RegExp(matcher.source, flags), next);
	} catch {
		return next;
	}
}

/**
 * @param {string} text
 * @param {RegExp|null} matcher
 * @return {Array<{ start: number, end: number, text: string }>}
 */
export function findMatchesInText(text, matcher) {
	if (!matcher || typeof text !== 'string' || text === '') {
		return [];
	}

	const matches = [];
	const local = new RegExp(matcher.source, matcher.flags);
	let match;
	let guard = 0;

	while ((match = local.exec(text)) !== null) {
		if (match[0] === '') {
			local.lastIndex += 1;
			continue;
		}

		matches.push({
			start: match.index,
			end: match.index + match[0].length,
			text: match[0],
		});

		if (++guard >= MAX_MATCHES_PER_STRING) {
			break;
		}
	}

	return matches;
}

/**
 * Replace the first range that matches start/end in `text`.
 *
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {string} replacement
 * @return {string}
 */
export function replaceRange(text, start, end, replacement) {
	return (
		text.slice(0, start) +
		(replacement ?? '') +
		text.slice(end)
	);
}

/**
 * Replace every matcher hit in `text`.
 *
 * @param {string} text
 * @param {RegExp} matcher
 * @param {string} replacement
 * @return {string}
 */
export function replaceAllInText(text, matcher, replacement) {
	if (!matcher || typeof text !== 'string') {
		return text;
	}

	const local = new RegExp(matcher.source, matcher.flags);
	return text.replace(local, replacement ?? '');
}
