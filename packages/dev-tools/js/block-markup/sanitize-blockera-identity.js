/**
 * Canonical Blockera identity in shipped Gutenberg markup.
 *
 * Matches editor persist: 6-character lowercase `blockeraId`, matching
 * unique class, no leftover props/compat ids or Basic Mode, no fingerprint
 * without feature attributes.
 *
 * @see packages/utils/js/editor/get-attributes-with-ids.js
 */

const crypto = require('crypto');
const { baseConfig } = require('./base-config');

const ID_LENGTH = 6;
const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const CANONICAL_ID = /^[0-9a-z]{6}$/;
const BLOCKERA_ATTR_KEY = /^blockera/i;
const UNIQUE_CLASS = /^blockera-block-/;
const LEGACY_DOUBLE_HYPHEN = /^blockera-block--/;

const META_KEYS = {
	blockeraId: true,
	blockeraPropsId: true,
	blockeraCompatId: true,
	blockeraBlockMode: true,
};

/**
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when identity sanitizing is on.
 */
function isBlockeraIdentitySanitizeEnabled(sanitize) {
	if (sanitize && sanitize.enabled === false) {
		return false;
	}

	const rule =
		(sanitize && sanitize.blockeraIdentity) ||
		baseConfig.sanitize.blockeraIdentity;

	return Boolean(rule) && rule.enabled !== false;
}

/**
 * @return {string} New 6-character lowercase alphanumeric id.
 */
function generateBlockeraMarkupId() {
	const bytes = crypto.randomBytes(ID_LENGTH);
	let id = '';

	for (let i = 0; i < ID_LENGTH; i++) {
		id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
	}

	return id;
}

/**
 * @param {mixed} value Feature value.
 * @return {mixed} Unwrapped inner value.
 */
function unwrapBlockeraAttributeValue(value) {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) {
		return value;
	}

	if (!Object.prototype.hasOwnProperty.call(value, 'value')) {
		return value;
	}

	return unwrapBlockeraAttributeValue(value.value);
}

/**
 * @param {mixed} value Feature value.
 * @return {boolean} True when empty.
 */
function isEmptyBlockeraFeatureValue(value) {
	const unwrapped = unwrapBlockeraAttributeValue(value);

	if (unwrapped === null || unwrapped === undefined || unwrapped === '') {
		return true;
	}

	if (Array.isArray(unwrapped)) {
		return unwrapped.length === 0;
	}

	if (typeof unwrapped === 'object') {
		return Object.keys(unwrapped).length === 0;
	}

	return false;
}

/**
 * @param {?Object} attributes Block attrs.
 * @return {boolean} True when a real Blockera feature remains.
 */
function hasBlockeraFeatureAttributes(attributes) {
	if (!attributes || typeof attributes !== 'object') {
		return false;
	}

	const keys = Object.keys(attributes);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!BLOCKERA_ATTR_KEY.test(key) || META_KEYS[key]) {
			continue;
		}

		if (!isEmptyBlockeraFeatureValue(attributes[key])) {
			return true;
		}
	}

	return false;
}

/**
 * @param {mixed} className className attr.
 * @return {string[]} Unique `blockera-block-*` tokens (not the base class).
 */
function getUniqueBlockeraClassTokens(className) {
	if (typeof className !== 'string' || !className) {
		return [];
	}

	const tokens = className.split(/\s+/).filter(Boolean);
	const unique = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token !== 'blockera-block' && UNIQUE_CLASS.test(token)) {
			unique.push(token);
		}
	}

	return unique;
}

/**
 * @param {mixed} className className attr.
 * @return {string} Classes without Blockera identity tokens.
 */
function stripBlockeraBlockClasses(className) {
	if (typeof className !== 'string' || !className) {
		return '';
	}

	return className
		.split(/\s+/)
		.filter(
			(token) =>
				token &&
				token !== 'blockera-block' &&
				!UNIQUE_CLASS.test(token)
		)
		.join(' ');
}

/**
 * @param {mixed} className Current className.
 * @param {string} id Canonical blockeraId.
 * @return {string} className with base + unique tokens.
 */
function withMatchingBlockeraClasses(className, id) {
	const rest = stripBlockeraBlockClasses(className);
	const tokens = rest ? rest.split(/\s+/).filter(Boolean) : [];
	tokens.push('blockera-block');
	tokens.push('blockera-block-' + id);
	return tokens.join(' ');
}

/**
 * @param {Object} configJson Parsed block attrs.
 * @return {boolean} True when identity already matches the persist contract.
 */
function isCanonicalBlockeraIdentity(configJson) {
	if (!configJson || typeof configJson !== 'object') {
		return true;
	}

	if (
		Object.prototype.hasOwnProperty.call(configJson, 'blockeraPropsId') ||
		Object.prototype.hasOwnProperty.call(configJson, 'blockeraCompatId') ||
		Object.prototype.hasOwnProperty.call(configJson, 'blockeraBlockMode')
	) {
		return false;
	}

	const unique = getUniqueBlockeraClassTokens(configJson.className);
	const hasBase =
		typeof configJson.className === 'string' &&
		configJson.className.split(/\s+/).indexOf('blockera-block') !== -1;
	const id =
		typeof configJson.blockeraId === 'string' ? configJson.blockeraId : '';
	const hasFeatures = hasBlockeraFeatureAttributes(configJson);

	for (let i = 0; i < unique.length; i++) {
		if (LEGACY_DOUBLE_HYPHEN.test(unique[i])) {
			return false;
		}
	}

	if (!hasFeatures) {
		return !id && unique.length === 0 && !hasBase;
	}

	if (!CANONICAL_ID.test(id)) {
		return false;
	}

	return (
		hasBase &&
		unique.length === 1 &&
		unique[0] === 'blockera-block-' + id
	);
}

/**
 * Push a unique-class remap for following HTML `class` attributes.
 *
 * @param {Array<Object>} replacements Sink.
 * @param {string} from Previous unique token.
 * @param {string} to Next unique token, or empty to strip.
 */
function recordClassReplacement(replacements, from, to) {
	if (!replacements || !from || from === to) {
		return;
	}

	replacements.push({ from, to: to || '' });
}

/**
 * Rewrite parsed attrs onto the canonical identity contract.
 *
 * @param {Object} configJson Parsed block comment JSON (mutated).
 * @param {Array<Object>} [replacements] HTML unique-class remaps.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when attrs changed.
 */
function sanitizeBlockeraIdentityAttrs(
	configJson,
	replacements,
	sanitize
) {
	if (!isBlockeraIdentitySanitizeEnabled(sanitize) || !configJson) {
		return false;
	}

	if (isCanonicalBlockeraIdentity(configJson)) {
		return false;
	}

	const previousUnique = getUniqueBlockeraClassTokens(configJson.className);
	let changed = false;

	if (Object.prototype.hasOwnProperty.call(configJson, 'blockeraPropsId')) {
		delete configJson.blockeraPropsId;
		changed = true;
	}

	if (Object.prototype.hasOwnProperty.call(configJson, 'blockeraCompatId')) {
		delete configJson.blockeraCompatId;
		changed = true;
	}

	if (Object.prototype.hasOwnProperty.call(configJson, 'blockeraBlockMode')) {
		delete configJson.blockeraBlockMode;
		changed = true;
	}

	if (!hasBlockeraFeatureAttributes(configJson)) {
		if (configJson.blockeraId !== undefined) {
			delete configJson.blockeraId;
			changed = true;
		}

		const stripped = stripBlockeraBlockClasses(configJson.className);
		if ((configJson.className || '') !== stripped) {
			if (stripped) {
				configJson.className = stripped;
			} else {
				delete configJson.className;
			}
			changed = true;
		}

		for (let i = 0; i < previousUnique.length; i++) {
			recordClassReplacement(replacements, previousUnique[i], '');
		}

		return changed;
	}

	let id =
		typeof configJson.blockeraId === 'string' ? configJson.blockeraId : '';

	if (!CANONICAL_ID.test(id)) {
		id = generateBlockeraMarkupId();
		configJson.blockeraId = id;
		changed = true;
	}

	const nextClass = withMatchingBlockeraClasses(configJson.className, id);
	if (configJson.className !== nextClass) {
		configJson.className = nextClass;
		changed = true;
	}

	const nextUnique = 'blockera-block-' + id;

	for (let i = 0; i < previousUnique.length; i++) {
		recordClassReplacement(replacements, previousUnique[i], nextUnique);
	}

	return changed;
}

/**
 * Apply unique-class remaps to an HTML class attribute.
 *
 * @param {string} classValue Current class.
 * @param {Array<{ from: string, to: string }>} replacements Remaps.
 * @return {string} Updated class list.
 */
function applyIdentityClassReplacements(classValue, replacements) {
	if (
		typeof classValue !== 'string' ||
		!classValue ||
		!replacements ||
		replacements.length === 0
	) {
		return classValue;
	}

	let tokens = classValue.split(/\s+/).filter(Boolean);
	let changed = false;

	for (let i = 0; i < replacements.length; i++) {
		const { from, to } = replacements[i];
		if (!from || tokens.indexOf(from) === -1) {
			continue;
		}

		changed = true;

		if (!to) {
			tokens = tokens.filter(
				(token) => token !== from && token !== 'blockera-block'
			);
			continue;
		}

		tokens = tokens.map((token) => (token === from ? to : token));
		if (tokens.indexOf('blockera-block') === -1) {
			tokens.unshift('blockera-block');
		}
	}

	return changed ? tokens.join(' ') : classValue;
}

/**
 * Fast-path dirty check over Gutenberg comments.
 *
 * @param {string} content File contents.
 * @param {Object} [sanitize] Resolved sanitize config.
 * @return {boolean} True when identity needs rewrite.
 */
function hasUnsanitizedBlockeraIdentity(content, sanitize) {
	if (!isBlockeraIdentitySanitizeEnabled(sanitize) || !content) {
		return false;
	}

	if (
		content.indexOf('blockeraPropsId') !== -1 ||
		content.indexOf('blockeraCompatId') !== -1 ||
		content.indexOf('blockeraBlockMode') !== -1 ||
		content.indexOf('blockera-block--') !== -1
	) {
		return true;
	}

	if (
		content.indexOf('blockeraId') === -1 &&
		content.indexOf('blockera-block') === -1
	) {
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

		const jsonStart = body.indexOf('{');
		const jsonEnd = body.lastIndexOf('}');
		if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
			continue;
		}

		try {
			const attrs = JSON.parse(body.slice(jsonStart, jsonEnd + 1));
			if (!isCanonicalBlockeraIdentity(attrs)) {
				return true;
			}
		} catch (_err) {
			if (
				body.indexOf('"blockeraId"') !== -1 ||
				body.indexOf('blockera-block') !== -1
			) {
				return true;
			}
		}
	}

	return false;
}

module.exports = {
	CANONICAL_ID,
	isBlockeraIdentitySanitizeEnabled,
	generateBlockeraMarkupId,
	hasBlockeraFeatureAttributes,
	isCanonicalBlockeraIdentity,
	sanitizeBlockeraIdentityAttrs,
	hasUnsanitizedBlockeraIdentity,
	applyIdentityClassReplacements,
	getUniqueBlockeraClassTokens,
	stripBlockeraBlockClasses,
};
