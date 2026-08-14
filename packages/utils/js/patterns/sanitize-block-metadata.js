/**
 * Strip Gutenberg insert-time pattern metadata copied when designing in the
 * editor and pasting into a pattern PHP file.
 *
 * Gutenberg writes `patternName`, `name`, `categories` (and sometimes
 * `description`) onto the root block at insert time. `patternName` also makes
 * the block a content-only section. Theme pattern sources already declare
 * Title / Description / Slug / Categories in the PHP file header; keep only
 * product-specific keys such as `blockeraOne`.
 *
 * @see source-codes/block-editor/packages/block-library/src/pattern/edit.js
 * @see source-codes/block-editor/packages/block-editor/src/store/private-selectors.js
 */

/**
 * Keys Gutenberg copies onto the inserted pattern root block.
 *
 * @type {string[]}
 */
const COPIED_PATTERN_METADATA_KEYS = [
	'patternName',
	'name',
	'description',
	'categories',
];

/**
 * Detect copied pattern metadata without parsing every block comment.
 * `patternName` is unique; the others are only dirty inside `metadata`.
 *
 * @param {string} content Pattern file contents.
 * @return {boolean} True when copied keys are still present.
 */
function hasUnsanitizedPatternMetadata(content) {
	if (!content || content.indexOf('"metadata"') === -1) {
		return false;
	}

	if (content.indexOf('"patternName"') !== -1) {
		return true;
	}

	return /"metadata"\s*:\s*\{[^{}]*"(?:name|description|categories)"/.test(
		content
	);
}

/**
 * Remove copied pattern keys from a parsed `metadata` object.
 *
 * @param {Object} configJson Parsed block comment JSON.
 * @return {boolean} True when any key was removed.
 */
function stripCopiedPatternMetadata(configJson) {
	const metadata = configJson && configJson.metadata;

	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		return false;
	}

	let changed = false;

	for (let i = 0; i < COPIED_PATTERN_METADATA_KEYS.length; i++) {
		const key = COPIED_PATTERN_METADATA_KEYS[i];
		if (!Object.prototype.hasOwnProperty.call(metadata, key)) {
			continue;
		}
		delete metadata[key];
		changed = true;
	}

	if (!changed) {
		return false;
	}

	if (Object.keys(metadata).length === 0) {
		delete configJson.metadata;
	}

	return true;
}

/**
 * Slice a JSON object starting at `{`, respecting strings and escapes.
 *
 * @param {string} source Source text.
 * @param {number} openBraceIndex Index of the opening `{`.
 * @return {{end: number, text: string}|null} Slice through the matching `}`.
 */
function extractJsonObject(source, openBraceIndex) {
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = openBraceIndex, len = source.length; i < len; i++) {
		const ch = source[i];

		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === '\\') {
				escaped = true;
				continue;
			}
			if (ch === '"') {
				inString = false;
			}
			continue;
		}

		if (ch === '"') {
			inString = true;
			continue;
		}

		if (ch === '{') {
			depth++;
			continue;
		}

		if (ch === '}') {
			depth--;
			if (depth === 0) {
				return {
					end: i,
					text: source.slice(openBraceIndex, i + 1),
				};
			}
		}
	}

	return null;
}

/**
 * Remove a JSON property spanning [keyStart, valueEnd] inclusive.
 *
 * @param {string} source JSON object text.
 * @param {number} keyStart Index of the property name's opening quote.
 * @param {number} valueEnd Index of the last character of the value.
 * @return {string} Source with the property removed.
 */
function removeJsonProperty(source, keyStart, valueEnd) {
	let left = keyStart - 1;
	while (left >= 0 && (source[left] === ' ' || source[left] === '\t')) {
		left--;
	}

	let right = valueEnd + 1;
	const len = source.length;
	while (right < len && (source[right] === ' ' || source[right] === '\t')) {
		right++;
	}

	if (left >= 0 && source[left] === ',') {
		return source.slice(0, left) + source.slice(right);
	}

	if (right < len && source[right] === ',') {
		return source.slice(0, keyStart) + source.slice(right + 1);
	}

	return source.slice(0, keyStart) + source.slice(right);
}

/**
 * Strip copied pattern metadata from a raw (possibly PHP-containing) JSON blob.
 *
 * Used when `JSON.parse` of the full block attrs fails because image URLs were
 * already rewritten to `<?php echo esc_url(...) ?>`.
 *
 * @param {string} config Raw JSON object text including the braces.
 * @return {string} Config with copied metadata keys removed.
 */
function sanitizeMetadataInRawConfig(config) {
	const marker = '"metadata"';
	const markerIndex = config.indexOf(marker);

	if (markerIndex === -1) {
		return config;
	}

	let colon = markerIndex + marker.length;
	while (
		colon < config.length &&
		(config[colon] === ' ' || config[colon] === '\t')
	) {
		colon++;
	}
	if (config[colon] !== ':') {
		return config;
	}

	let braceStart = colon + 1;
	while (
		braceStart < config.length &&
		(config[braceStart] === ' ' || config[braceStart] === '\t')
	) {
		braceStart++;
	}
	if (config[braceStart] !== '{') {
		return config;
	}

	const extracted = extractJsonObject(config, braceStart);
	if (!extracted) {
		return config;
	}

	let metadata;
	try {
		metadata = JSON.parse(extracted.text);
	} catch (error) {
		return config;
	}

	const wrapper = { metadata };
	if (!stripCopiedPatternMetadata(wrapper)) {
		return config;
	}

	if (!wrapper.metadata) {
		return removeJsonProperty(config, markerIndex, extracted.end);
	}

	return (
		config.slice(0, braceStart) +
		JSON.stringify(wrapper.metadata) +
		config.slice(extracted.end + 1)
	);
}

module.exports = {
	COPIED_PATTERN_METADATA_KEYS,
	hasUnsanitizedPatternMetadata,
	stripCopiedPatternMetadata,
	sanitizeMetadataInRawConfig,
};
