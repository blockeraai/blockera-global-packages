/**
 * Internal dependencies
 */
const { escapeText } = require('./escape-text');
const { baseConfig } = require('./base-config');
const {
	stripCopiedPatternMetadata,
	sanitizeMetadataInRawConfig,
} = require('./sanitize-block-metadata');
const {
	getBlockNameFromComment,
	stripBlockRoleAttrs,
	sanitizeBlockRolesInRawConfig,
} = require('./sanitize-block-roles');
const { sanitizeBlockeraIdentityAttrs } = require('./sanitize-blockera-identity');

/**
 * @param {Object} [pipeline] Optional sanitize / localize slices.
 * @return {{ sanitize: Object, localize: Object }} Resolved pipeline.
 */
function resolvePipeline(pipeline = {}) {
	return {
		sanitize: pipeline.sanitize || baseConfig.sanitize,
		localize: pipeline.localize || baseConfig.localize,
	};
}

/**
 * Enabled localize.blockAttrs entries.
 *
 * @param {Object} localize Resolved localize config.
 * @return {Array<{ name: string, isAttr: boolean }>} Attrs to wrap.
 */
function getLocalizeBlockAttrs(localize) {
	if (!localize || localize.enabled === false) {
		return [];
	}

	if (!localize.blockAttrs || localize.blockAttrs.enabled === false) {
		return [];
	}

	const attrs = localize.blockAttrs.attrs || {};
	const names = Object.keys(attrs);
	const out = [];

	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		const rule = attrs[name];
		if (!rule || rule.enabled === false) {
			continue;
		}
		out.push({ name, isAttr: Boolean(rule.isAttr) });
	}

	return out;
}

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
 * Sanitize and optionally localize string attributes inside a block comment.
 *
 * @param {string} block Raw block comment text (without surrounding delimiters).
 * @param {string} textDomain Text domain.
 * @param {Object} [pipeline] `{ sanitize, localize }` from resolved config.
 * @return {string} Block comment text.
 */
function escapeBlockAttrs(block, textDomain, pipeline = {}) {
	const { sanitize, localize } = resolvePipeline(pipeline);
	const start = block.indexOf('{');
	const end = block.lastIndexOf('}');

	if (start === -1 || end === -1 || start >= end) {
		return block;
	}

	const configPrefix = block.slice(0, start);
	const config = block.slice(start, end + 1);
	const configSuffix = block.slice(end + 1);
	const blockName = getBlockNameFromComment(configPrefix);
	const localizeAttrs = getLocalizeBlockAttrs(localize);
	const textConfig = (localize && localize.text) || {};

	try {
		const configJson = JSON.parse(config);

		stripCopiedPatternMetadata(configJson, sanitize);
		stripBlockRoleAttrs(configJson, blockName, sanitize);
		sanitizeBlockeraIdentityAttrs(
			configJson,
			pipeline.identityClassReplacements,
			sanitize
		);

		for (const attr of localizeAttrs) {
			if (!configJson[attr.name]) {
				continue;
			}

			configJson[attr.name] = escapeText(
				configJson[attr.name],
				textDomain,
				Boolean(attr.isAttr),
				textConfig
			);
		}

		return stringifyBlockConfig(configPrefix, configJson, configSuffix);
	} catch (error) {
		const nextConfig = sanitizeBlockRolesInRawConfig(
			sanitizeMetadataInRawConfig(config, sanitize),
			blockName,
			sanitize
		);

		if (nextConfig === '{}') {
			return configPrefix.replace(/\s+$/, '') + configSuffix;
		}

		return configPrefix + nextConfig + configSuffix;
	}
}

module.exports = {
	escapeBlockAttrs,
	getLocalizeBlockAttrs,
	ALLOWED_BLOCK_ATTRS: [
		{ name: 'label' },
		{ name: 'placeholder', isAttr: true },
		{ name: 'buttonText' },
		{ name: 'content' },
		{ name: 'ariaLabel', isAttr: true },
	],
};
