/**
 * Strip instance-specific attributes copied from the editor, keyed by
 * Gutenberg block name (the block "role").
 *
 * Pattern sources must not ship a Query Loop `queryId`. Gutenberg assigns a
 * fresh id at insert time when the attribute is not finite — a hardcoded
 * value collides when the same pattern is used more than once.
 *
 * Comment tokens drop the `core/` prefix (`wp:query` for `core/query`).
 *
 * @see source-codes/block-editor/packages/block-library/src/query/block.json
 * @see source-codes/block-editor/packages/block-library/src/query/edit/query-content.js
 * @see source-codes/block-editor/packages/blocks/src/api/serializer.tsx
 */

/**
 * Internal dependencies
 */
const { escapeRegExp } = require('./escape-image-path');

/**
 * Attributes to remove, keyed by Gutenberg block name.
 *
 * @type {Object<string, string[]>}
 */
const BLOCK_ROLE_SANITIZE_ATTRS = {
	'core/query': ['queryId'],
};

/**
 * Gutenberg comment token for a block name (`core/query` → `query`).
 *
 * @param {string} blockName Gutenberg block name.
 * @return {string} Comment token after `wp:`.
 */
function toCommentToken(blockName) {
	return blockName.indexOf('core/') === 0 ? blockName.slice(5) : blockName;
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
 * @return {boolean} True when a registered block still has a dirty attr.
 */
function hasUnsanitizedBlockRoleAttrs(content) {
	if (!content) {
		return false;
	}

	const names = Object.keys(BLOCK_ROLE_SANITIZE_ATTRS);

	for (let i = 0; i < names.length; i++) {
		const blockName = names[i];
		const keys = BLOCK_ROLE_SANITIZE_ATTRS[blockName];
		const token = escapeRegExp(toCommentToken(blockName));

		if (!new RegExp(`<!--\\s+wp:${token}(?:\\s|\\{)`).test(content)) {
			continue;
		}

		for (let k = 0; k < keys.length; k++) {
			if (content.indexOf(`"${keys[k]}"`) !== -1) {
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
 * @return {boolean} True when any key was removed.
 */
function stripBlockRoleAttrs(configJson, blockName) {
	if (!configJson || !blockName) {
		return false;
	}

	const keys = BLOCK_ROLE_SANITIZE_ATTRS[blockName];

	if (!keys) {
		return false;
	}

	let changed = false;

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!Object.prototype.hasOwnProperty.call(configJson, key)) {
			continue;
		}
		delete configJson[key];
		changed = true;
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
 * @return {string} Config with registered keys removed.
 */
function sanitizeBlockRolesInRawConfig(config, blockName) {
	if (!config || !blockName) {
		return config;
	}

	const keys = BLOCK_ROLE_SANITIZE_ATTRS[blockName];

	if (!keys) {
		return config;
	}

	let next = config;

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
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
	BLOCK_ROLE_SANITIZE_ATTRS,
	getBlockNameFromComment,
	hasUnsanitizedBlockRoleAttrs,
	stripBlockRoleAttrs,
	sanitizeBlockRolesInRawConfig,
};
