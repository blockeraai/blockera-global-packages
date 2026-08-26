/**
 * Strip instance-specific attributes copied from the editor, keyed by
 * Gutenberg block name (the block "role").
 *
 * @see source-codes/block-editor/packages/block-library/src/query/block.json
 * @see source-codes/block-editor/packages/block-library/src/query/edit/query-content.js
 * @see source-codes/block-editor/packages/blocks/src/api/serializer.tsx
 */

const { baseConfig } = require('./base-config');
const { extractBlockeraOneStamp, isSkipLocalizeStamp } = require('./skip-localize-stamps');

/**
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {Object} Sanitize config.
 */
function resolveSanitize(sanitize) {
	return sanitize || baseConfig.sanitize;
}

/**
 * Enabled attr rules for a Gutenberg block.
 *
 * `path` is a dotted JSON path (`query.perPage`). Detection and raw-JSON
 * stripping use the last segment (`perPage`).
 *
 * @param {Object} [sanitize] Resolved sanitize config.
 * @param {string} blockName Gutenberg block name.
 * `stamps` limits the rule to matching `metadata.blockeraOne.stamp` values
 * (`role/id` or `role/id:variant`). Empty/omitted stamps apply to every
 * instance of the block.
 *
 * @return {Array<{ jsonKey: string, path: string[], stamps: string[] }>}
 */
function getEnabledBlockRoleAttrRules(sanitize, blockName) {
	const resolved = resolveSanitize(sanitize);

	if (resolved.enabled === false || !blockName) {
		return [];
	}

	const block = resolved.blocks && resolved.blocks[blockName];
	if (!block || block.enabled === false || !block.attrs) {
		return [];
	}

	const keys = Object.keys(block.attrs);
	const enabled = [];

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const rule = block.attrs[key];
		if (!rule || rule.enabled === false) {
			continue;
		}

		const path =
			typeof rule.path === 'string' && rule.path
				? rule.path.split('.')
				: [key];

		enabled.push({
			jsonKey: path[path.length - 1],
			path,
			stamps: Array.isArray(rule.stamps) ? rule.stamps : [],
		});
	}

	return enabled;
}

/**
 * Enabled JSON keys to look for on a Gutenberg block.
 *
 * @param {Object} [sanitize] Resolved sanitize config.
 * @param {string} blockName Gutenberg block name.
 * @return {string[]} Attr keys to strip / detect.
 */
function getEnabledBlockRoleAttrs(sanitize, blockName) {
	const rules = getEnabledBlockRoleAttrRules(sanitize, blockName);
	const keys = [];

	for (let i = 0; i < rules.length; i++) {
		keys.push(rules[i].jsonKey);
	}

	return keys;
}

/**
 * Delete a dotted path from a nested object.
 *
 * @param {Object} target Parsed attrs.
 * @param {string[]} path Path segments.
 * @return {boolean} True when a key was removed.
 */
function deleteAtPath(target, path) {
	if (!target || !path || path.length === 0) {
		return false;
	}

	let cursor = target;

	for (let i = 0; i < path.length - 1; i++) {
		const part = path[i];
		const next = cursor[part];
		if (!next || typeof next !== 'object' || Array.isArray(next)) {
			return false;
		}
		cursor = next;
	}

	const last = path[path.length - 1];
	if (!Object.prototype.hasOwnProperty.call(cursor, last)) {
		return false;
	}

	delete cursor[last];
	return true;
}

/**
 * @param {{ stamps?: string[] }} rule Attr rule.
 * @param {string} stamp Block `metadata.blockeraOne.stamp` (`role/id:variant`).
 * @return {boolean} True when ungated, or the stamp's role/id matches.
 */
function ruleAppliesToStamp(rule, stamp) {
	const prefixes = rule && rule.stamps;
	if (!prefixes || prefixes.length === 0) {
		return true;
	}

	return isSkipLocalizeStamp(stamp, prefixes);
}

/**
 * @param {Object} configJson Parsed block attrs.
 * @return {string} Stamp string or empty.
 */
function getStampFromConfigJson(configJson) {
	const stamp = configJson?.metadata?.blockeraOne?.stamp;
	return typeof stamp === 'string' ? stamp : '';
}

/**
 * Resolve a `wp:…` comment token to a Gutenberg block name.
 *
 * @param {string} token Token after `wp:` (`query`, `core/query`, `foo/bar`).
 * @return {string} Block name (`core/query`, `foo/bar`).
 */
function blockNameFromToken(token) {
	return token.indexOf('/') === -1 ? `core/${token}` : token;
}

/**
 * Gutenberg block name from a raw block comment (` wp:query {…} `).
 *
 * @param {string} block Comment text without `<!--` / `-->`.
 * @return {string|null} Block name, or null when the token is missing.
 */
function getBlockNameFromComment(block) {
	if (!block) {
		return null;
	}

	const match = /^\s*wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)/i.exec(
		block
	);

	if (!match) {
		return null;
	}

	return blockNameFromToken(match[1]);
}

/**
 * Detect unsanitized per-block-role attrs without parsing every comment.
 *
 * @param {string} content Pattern file contents.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when a registered block still has a dirty attr.
 */
function hasUnsanitizedBlockRoleAttrs(content, sanitize) {
	if (!content) {
		return false;
	}

	const resolved = resolveSanitize(sanitize);
	if (resolved.enabled === false || !resolved.blocks) {
		return false;
	}

	const names = Object.keys(resolved.blocks);
	const rulesByBlock = {};

	for (let i = 0; i < names.length; i++) {
		const blockName = names[i];
		const rules = getEnabledBlockRoleAttrRules(resolved, blockName);
		if (rules.length > 0) {
			rulesByBlock[blockName] = rules;
		}
	}

	if (Object.keys(rulesByBlock).length === 0) {
		return false;
	}

	let cursor = 0;

	while (cursor < content.length) {
		const start = content.indexOf('<!--', cursor);
		if (start === -1) {
			break;
		}
		const end = content.indexOf('-->', start + 4);
		if (end === -1) {
			break;
		}

		const body = content.slice(start + 4, end);
		cursor = end + 3;

		const blockName = getBlockNameFromComment(body);
		const rules = blockName ? rulesByBlock[blockName] : null;
		if (!rules) {
			continue;
		}

		const stamp = extractBlockeraOneStamp(body);

		for (let r = 0; r < rules.length; r++) {
			const rule = rules[r];
			if (!ruleAppliesToStamp(rule, stamp)) {
				continue;
			}
			if (body.indexOf(`"${rule.jsonKey}"`) !== -1) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Remove registered instance attrs from a parsed block attrs object.
 *
 * @param {Object} configJson Parsed block comment JSON.
 * @param {string|null} blockName Gutenberg block name.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when any key was removed.
 */
function stripBlockRoleAttrs(configJson, blockName, sanitize) {
	if (!configJson || !blockName) {
		return false;
	}

	const rules = getEnabledBlockRoleAttrRules(sanitize, blockName);

	if (!rules.length) {
		return false;
	}

	const stamp = getStampFromConfigJson(configJson);
	let changed = false;

	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (!ruleAppliesToStamp(rule, stamp)) {
			continue;
		}
		if (deleteAtPath(configJson, rule.path)) {
			changed = true;
		}
	}

	return changed;
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
 * End index of a JSON primitive (string / number / bool / null) at valueStart.
 *
 * @param {string} source JSON object text.
 * @param {number} valueStart First character of the value.
 * @return {number} Inclusive end index, or -1 when the value is not a primitive.
 */
function findJsonPrimitiveValueEnd(source, valueStart) {
	const ch = source[valueStart];

	if (ch === '{' || ch === '[') {
		return -1;
	}

	if (ch === '"') {
		let escaped = false;
		for (let i = valueStart + 1, len = source.length; i < len; i++) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (source[i] === '\\') {
				escaped = true;
				continue;
			}
			if (source[i] === '"') {
				return i;
			}
		}
		return -1;
	}

	let i = valueStart;
	const len = source.length;
	while (
		i < len &&
		source[i] !== ',' &&
		source[i] !== '}' &&
		source[i] !== ']'
	) {
		i++;
	}

	return i - 1;
}

/**
 * Strip registered instance attrs from a raw (possibly PHP-containing) JSON blob.
 *
 * @param {string} config Raw JSON object text including the braces.
 * @param {string|null} blockName Gutenberg block name.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {string} Config with registered keys removed.
 */
function sanitizeBlockRolesInRawConfig(config, blockName, sanitize) {
	if (!config || !blockName) {
		return config;
	}

	const rules = getEnabledBlockRoleAttrRules(sanitize, blockName);

	if (!rules.length) {
		return config;
	}

	const stamp = extractBlockeraOneStamp(config);
	let next = config;

	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (!ruleAppliesToStamp(rule, stamp)) {
			continue;
		}

		const key = rule.jsonKey;
		const marker = `"${key}"`;
		const keyStart = next.indexOf(marker);

		if (keyStart === -1) {
			continue;
		}

		let colon = keyStart + marker.length;
		while (
			colon < next.length &&
			(next[colon] === ' ' || next[colon] === '\t')
		) {
			colon++;
		}
		if (next[colon] !== ':') {
			continue;
		}

		let valueStart = colon + 1;
		while (
			valueStart < next.length &&
			(next[valueStart] === ' ' || next[valueStart] === '\t')
		) {
			valueStart++;
		}

		const valueEnd = findJsonPrimitiveValueEnd(next, valueStart);
		if (valueEnd < valueStart) {
			continue;
		}

		next = removeJsonProperty(next, keyStart, valueEnd);
	}

	return next;
}

module.exports = {
	BLOCK_ROLE_SANITIZE_ATTRS: { 'core/query': ['queryId', 'perPage'] },
	getEnabledBlockRoleAttrRules,
	getEnabledBlockRoleAttrs,
	getBlockNameFromComment,
	hasUnsanitizedBlockRoleAttrs,
	stripBlockRoleAttrs,
	sanitizeBlockRolesInRawConfig,
};
