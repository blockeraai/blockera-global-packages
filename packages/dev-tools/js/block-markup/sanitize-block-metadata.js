/**
 * Strip Gutenberg insert-time pattern metadata copied when designing in the
 * editor and pasting into a pattern PHP file.
 *
 * @see source-codes/block-editor/packages/block-library/src/pattern/edit.js
 * @see source-codes/block-editor/packages/block-editor/src/store/private-selectors.js
 */

const { baseConfig } = require('./base-config');

const COPIED_PATTERN_TITLE_KEY = 'name';

/**
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {Object} Metadata rule.
 */
function resolveMetadata(sanitize) {
	if (sanitize && sanitize.metadata) {
		return sanitize.metadata;
	}

	return baseConfig.sanitize.metadata;
}

/**
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when metadata sanitizing is on.
 */
function isMetadataSanitizeEnabled(sanitize) {
	if (sanitize && sanitize.enabled === false) {
		return false;
	}

	const metadata = resolveMetadata(sanitize);
	return metadata.enabled !== false;
}

/**
 * Detect copied pattern metadata without parsing every block comment.
 *
 * @param {string} content Pattern file contents.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when copied keys are still present.
 */
function hasUnsanitizedPatternMetadata(content, sanitize) {
	if (!isMetadataSanitizeEnabled(sanitize) || !content) {
		return false;
	}

	if (content.indexOf('"metadata"') === -1) {
		return false;
	}

	const metadata = resolveMetadata(sanitize);
	const keys = metadata.keys || [];

	if (keys.indexOf('patternName') !== -1 && content.indexOf('"patternName"') !== -1) {
		return true;
	}

	const nested = [];
	for (let i = 0; i < keys.length; i++) {
		if (keys[i] !== 'patternName') {
			nested.push(keys[i]);
		}
	}

	if (nested.length === 0) {
		return false;
	}

	return new RegExp(
		`"metadata"\\s*:\\s*\\{[^{}]*"(?:${nested.join('|')})"`
	).test(content);
}

/**
 * Remove copied pattern keys from a parsed `metadata` object.
 *
 * @param {Object} configJson Parsed block comment JSON.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when any key was removed.
 */
function stripCopiedPatternMetadata(configJson, sanitize) {
	if (!isMetadataSanitizeEnabled(sanitize)) {
		return false;
	}

	const metadata = configJson && configJson.metadata;

	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		return false;
	}

	const rule = resolveMetadata(sanitize);
	const keys = rule.keys || [];
	let changed = false;
	const isCopiedPatternRoot = Object.prototype.hasOwnProperty.call(
		metadata,
		'patternName'
	);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!Object.prototype.hasOwnProperty.call(metadata, key)) {
			continue;
		}
		delete metadata[key];
		changed = true;
	}

	if (
		rule.stripTitleWithPatternName &&
		isCopiedPatternRoot &&
		Object.prototype.hasOwnProperty.call(metadata, COPIED_PATTERN_TITLE_KEY)
	) {
		delete metadata[COPIED_PATTERN_TITLE_KEY];
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
 * @param {string} config Raw JSON object text including the braces.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {string} Config with copied metadata keys removed.
 */
function sanitizeMetadataInRawConfig(config, sanitize) {
	if (!isMetadataSanitizeEnabled(sanitize)) {
		return config;
	}

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
	if (!stripCopiedPatternMetadata(wrapper, sanitize)) {
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
	COPIED_PATTERN_METADATA_KEYS: baseConfig.sanitize.metadata.keys,
	hasUnsanitizedPatternMetadata,
	isMetadataSanitizeEnabled,
	resolveMetadata,
	stripCopiedPatternMetadata,
	sanitizeMetadataInRawConfig,
};
