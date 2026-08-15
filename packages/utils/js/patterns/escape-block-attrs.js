/**
 * Internal dependencies
 */
const { escapeText } = require('./escape-text');
const {
	stripCopiedPatternMetadata,
	sanitizeMetadataInRawConfig,
} = require('./sanitize-block-metadata');

const ALLOWED_BLOCK_ATTRS = [
	{ name: 'label' },
	{ name: 'placeholder', isAttr: true },
	{ name: 'buttonText' },
	{ name: 'content' },
	{ name: 'ariaLabel', isAttr: true },
];

/**
 * Serialize block comment JSON, omitting an empty `{}` attrs object.
 *
 * @param {string} configPrefix Text before the JSON object.
 * @param {Object} configJson Parsed attrs.
 * @param {string} configSuffix Text after the JSON object.
 * @return {string} Block comment text.
 */
function stringifyBlockConfig(configPrefix, configJson, configSuffix) {
	if (Object.keys(configJson).length === 0) {
		return configPrefix.replace(/\s+$/, '') + configSuffix;
	}

	return configPrefix + JSON.stringify(configJson) + configSuffix;
}

/**
 * Escape selected string attributes inside a Gutenberg block comment JSON blob
 * and strip copied pattern metadata (`patternName`, `description`, …).
 * Keeps `metadata.name` unless it was copied with `patternName`.
 *
 * @param {string} block Raw block comment text (without surrounding delimiters).
 * @param {string} textDomain Text domain.
 * @return {string} Block comment text with escaped attrs when parseable.
 */
function escapeBlockAttrs(block, textDomain) {
	const start = block.indexOf('{');
	const end = block.lastIndexOf('}');

	if (start === -1 || end === -1 || start >= end) {
		return block;
	}

	const configPrefix = block.slice(0, start);
	const config = block.slice(start, end + 1);
	const configSuffix = block.slice(end + 1);

	try {
		const configJson = JSON.parse(config);

		stripCopiedPatternMetadata(configJson);

		for (const attr of ALLOWED_BLOCK_ATTRS) {
			if (!configJson[attr.name]) {
				continue;
			}

			configJson[attr.name] = escapeText(
				configJson[attr.name],
				textDomain,
				Boolean(attr.isAttr)
			);
		}

		return stringifyBlockConfig(configPrefix, configJson, configSuffix);
	} catch (error) {
		// Image URL rewrites inject PHP, which is not valid JSON. Still strip
		// copied pattern metadata from the raw attrs blob.
		const nextConfig = sanitizeMetadataInRawConfig(config);

		if (nextConfig === '{}') {
			return configPrefix.replace(/\s+$/, '') + configSuffix;
		}

		return configPrefix + nextConfig + configSuffix;
	}
}

module.exports = { escapeBlockAttrs, ALLOWED_BLOCK_ATTRS };
