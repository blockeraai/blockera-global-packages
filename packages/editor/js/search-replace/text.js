/**
 * Plain-text and rich-text value helpers for search/replace.
 *
 * @package
 */

import {
	create,
	getTextContent,
	toHTMLString,
} from '@wordpress/rich-text';
import { applyReplacement, findMatchesInText } from './matcher';

function isRichTextValue(value) {
	return (
		value &&
		typeof value === 'object' &&
		typeof value.text === 'string' &&
		Array.isArray(value.formats)
	);
}

function isRichTextData(value) {
	return (
		value &&
		typeof value === 'object' &&
		typeof value.toPlainText === 'function'
	);
}

/**
 * @param {*} value
 * @return {string}
 */
export function toPlainText(value) {
	if (value == null) {
		return '';
	}

	if (typeof value === 'string') {
		if (value.includes('<') && value.includes('>')) {
			try {
				return getTextContent(create({ html: value }));
			} catch {
				return value;
			}
		}
		return value;
	}

	if (isRichTextData(value)) {
		return value.toPlainText();
	}

	if (isRichTextValue(value)) {
		return getTextContent(value);
	}

	if (typeof value === 'object' && typeof value.text === 'string') {
		return value.text;
	}

	return String(value);
}

function toRichTextValue(value) {
	if (isRichTextValue(value)) {
		return value;
	}

	if (isRichTextData(value)) {
		if (typeof value.toHTMLString === 'function') {
			return create({ html: value.toHTMLString() });
		}
		return create({ text: value.toPlainText() });
	}

	if (typeof value === 'string') {
		if (value.includes('<') && value.includes('>')) {
			return create({ html: value });
		}
		return create({ text: value });
	}

	return create({ text: toPlainText(value) });
}

function fromRichTextValue(original, nextValue) {
	const html = toHTMLString({ value: nextValue });

	if (typeof original === 'string') {
		if (original.includes('<') && original.includes('>')) {
			return html;
		}
		return getTextContent(nextValue);
	}

	if (isRichTextData(original) && original.constructor?.fromHTMLString) {
		return original.constructor.fromHTMLString(html);
	}

	if (isRichTextValue(original)) {
		return nextValue;
	}

	return getTextContent(nextValue);
}

function replaceAtOffsets(rich, start, end, replacement) {
	const text = rich.text || '';
	const formats = rich.formats || [];
	const replacements = rich.replacements || [];
	const insert = replacement ?? '';
	const nextText = text.slice(0, start) + insert + text.slice(end);
	const formatAt = formats[start];
	const insertedFormats = Array.from(
		{ length: insert.length },
		() => formatAt || undefined
	);
	const insertedReplacements = Array.from(
		{ length: insert.length },
		() => undefined
	);

	return {
		...rich,
		text: nextText,
		formats: formats
			.slice(0, start)
			.concat(insertedFormats, formats.slice(end)),
		replacements: replacements
			.slice(0, start)
			.concat(insertedReplacements, replacements.slice(end)),
	};
}

/**
 * Replace a single character range inside a stored attribute value.
 *
 * @param {*} value
 * @param {number} start
 * @param {number} end
 * @param {string} replacement
 * @return {*}
 */
export function replaceValueRange(value, start, end, replacement) {
	if (typeof value === 'string' && !value.includes('<')) {
		return value.slice(0, start) + (replacement ?? '') + value.slice(end);
	}

	const rich = toRichTextValue(value);
	return fromRichTextValue(
		value,
		replaceAtOffsets(rich, start, end, replacement ?? '')
	);
}

/**
 * Replace every matcher occurrence in a stored attribute value.
 *
 * @param {*} value
 * @param {RegExp} matcher
 * @param {string} replacement
 * @param {{ query: string, matchCase?: boolean, wholeWord?: boolean, useRegex?: boolean }} [options]
 * @return {*}
 */
export function replaceValueAll(value, matcher, replacement, options) {
	const hits = findMatchesInText(toPlainText(value), matcher);

	if (!hits.length) {
		return value;
	}

	let next = value;

	for (let index = hits.length - 1; index >= 0; index--) {
		const hit = hits[index];
		next = replaceValueRange(
			next,
			hit.start,
			hit.end,
			applyReplacement(hit.text, options, replacement)
		);
	}

	return next;
}
