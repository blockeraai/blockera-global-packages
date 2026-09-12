/**
 * Apply a search match replacement onto block attributes.
 *
 * @package
 */

import { collectLeaves, setAtLocation } from './paths';
import { replaceValueAll, replaceValueRange, toPlainText } from './text';
import { applyReplacement, buildMatcher } from './matcher';

/**
 * Replace one match in a block's attributes.
 *
 * @param {Object} attributes
 * @param {Object} match
 * @param {string} replacement
 * @param {{ query: string, matchCase?: boolean, wholeWord?: boolean, useRegex?: boolean }} [options]
 * @return {Object}
 */
export function replaceMatchInAttributes(
	attributes,
	match,
	replacement,
	options
) {
	const leaves = collectLeaves(attributes, match.path);
	const leaf = leaves.find((item) =>
		sameLocation(item.loc, match.loc)
	);

	if (!leaf) {
		return attributes;
	}

	const matchedText =
		match.matchText ??
		toPlainText(leaf.value).slice(match.start, match.end);
	const nextValue = replaceValueRange(
		leaf.value,
		match.start,
		match.end,
		applyReplacement(matchedText, options, replacement)
	);

	return setAtLocation(attributes, leaf.loc, nextValue);
}

/**
 * Replace all matcher hits for the given paths on one block.
 *
 * @param {Object} attributes
 * @param {string[]} paths
 * @param {{ query: string, matchCase?: boolean, wholeWord?: boolean, useRegex?: boolean }} options
 * @param {string} replacement
 * @return {Object}
 */
export function replaceAllInAttributes(attributes, paths, options, replacement) {
	const matcher = buildMatcher(options);
	if (!matcher) {
		return attributes;
	}

	let next = attributes;

	for (const path of paths) {
		const leaves = collectLeaves(next, path);
		for (const leaf of leaves) {
			const nextValue = replaceValueAll(
				leaf.value,
				matcher,
				replacement ?? '',
				options
			);
			next = setAtLocation(next, leaf.loc, nextValue);
		}
	}

	return next;
}

function sameLocation(a = [], b = []) {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((part, index) => part === b[index]);
}
