// @flow

/**
 * Internal dependencies
 */
import { isEquals } from '../array';

declare var crypto: {
	getRandomValues: (buffer: Uint8Array) => Uint8Array,
};

const ID_LENGTH = 6;
const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_CHARS: Array<string> = ID_ALPHABET.split('');
const ID_RADIX = 36;
const POOL_SIZE = 256;
const entropyPool = new Uint8Array(POOL_SIZE);
let poolOffset = POOL_SIZE;
let idSequence = 0;

function refillEntropyPool(): void {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.getRandomValues === 'function'
	) {
		crypto.getRandomValues(entropyPool);
	} else {
		for (let i = 0; i < POOL_SIZE; i++) {
			entropyPool[i] = Math.floor(Math.random() * 256);
		}
	}
	poolOffset = 0;
}

/**
 * 6-character lowercase alphanumeric id for `blockeraId`.
 *
 * Draws from a reused CSPRNG byte pool (one syscall per ~42 ids) and a
 * session counter so back-to-back calls stay unique in the same tick.
 *
 * @return {string} A new attribute id.
 */
export function generateBlockeraAttributeId(): string {
	if (poolOffset + ID_LENGTH > POOL_SIZE) {
		refillEntropyPool();
	}

	const offset = poolOffset;
	poolOffset += ID_LENGTH;
	idSequence = (idSequence + 1) >>> 0;

	return (
		ID_CHARS[(entropyPool[offset] ^ (idSequence & 255)) % ID_RADIX] +
		ID_CHARS[
			(entropyPool[offset + 1] ^ ((idSequence >>> 8) & 255)) % ID_RADIX
		] +
		ID_CHARS[entropyPool[offset + 2] % ID_RADIX] +
		ID_CHARS[entropyPool[offset + 3] % ID_RADIX] +
		ID_CHARS[entropyPool[offset + 4] % ID_RADIX] +
		ID_CHARS[entropyPool[offset + 5] % ID_RADIX]
	);
}

const BLOCKERA_ATTR_KEY = /^blockera/i;
const BLOCKERA_UNIQUE_CLASS = /^blockera-block-[\w-]+$/i;

export const BLOCKERA_META_ATTRIBUTE_KEYS: { [string]: boolean } = {
	blockeraId: true,
	blockeraPropsId: true,
	blockeraCompatId: true,
	blockeraBlockMode: true,
};

export function getBlockeraId(attributes: ?Object): string {
	if (!attributes || typeof attributes !== 'object') {
		return '';
	}
	if (attributes.blockeraId) {
		return String(attributes.blockeraId);
	}
	if (attributes.blockeraPropsId) {
		return String(attributes.blockeraPropsId);
	}
	return '';
}

export function isBlockeraBlockModeBasic(attributes: ?Object): boolean {
	return attributes?.blockeraBlockMode === 'basic';
}

/**
 * True when the store still has legacy identity keys and no canonical `blockeraId`.
 *
 * @param {?Object} attributes Block attributes.
 * @return {boolean} Whether a one-shot migrate to `blockeraId` is needed.
 */
export function needsLegacyBlockeraIdMigrate(attributes: ?Object): boolean {
	if (!attributes || typeof attributes !== 'object') {
		return false;
	}

	return (
		!attributes.blockeraId &&
		Boolean(attributes.blockeraPropsId || attributes.blockeraCompatId)
	);
}

/**
 * Mint a 6-character `blockeraId`, drop legacy keys, rewrite unique class.
 *
 * Old `blockera-block--*` tokens are discarded.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Migrated attributes.
 */
export function migrateLegacyBlockeraIds(attributes: Object): Object {
	if (!needsLegacyBlockeraIdMigrate(attributes)) {
		return attributes;
	}

	const next = { ...attributes };
	next.blockeraPropsId = undefined;
	next.blockeraCompatId = undefined;
	next.blockeraId = generateBlockeraAttributeId();

	const stripped = stripBlockeraBlockClasses(next.className);

	return withBlockeraBlockClassFromId({
		...next,
		className: stripped || undefined,
	});
}

function unwrapBlockeraAttributeValue(value: mixed): mixed {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) {
		return value;
	}

	const record: { [string]: mixed } = (value: any);

	if (!('value' in record)) {
		return value;
	}

	return unwrapBlockeraAttributeValue(record.value);
}

function isEmptyBlockeraFeatureValue(value: mixed): boolean {
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

function getRegisteredDefaultValue(
	defaultAttributes: ?Object,
	key: string
): mixed {
	if (!defaultAttributes || typeof defaultAttributes !== 'object') {
		return undefined;
	}

	const entry = defaultAttributes[key];
	if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
		return entry;
	}

	const record: { [string]: mixed } = (entry: any);

	if ('type' in record && 'default' in record) {
		return record.default;
	}

	return entry;
}

/**
 * True when any non-meta `blockera*` attribute still has a real value.
 *
 * Meta keys (`blockeraId`, legacy ids, `blockeraBlockMode`) do not count.
 * Values equal to the registered default do not count (e.g. `{ value: 'none' }`).
 * Empty wrappers, `''`, `[]`, and `{}` do not count. `0` and `false` do.
 *
 * @param {?Object} attributes Block attributes.
 * @param {?Object} defaultAttributes Registered schema or prepared default values.
 * @return {boolean} Whether feature attributes remain.
 */
export function hasBlockeraFeatureAttributes(
	attributes: ?Object,
	defaultAttributes: ?Object
): boolean {
	if (!attributes || typeof attributes !== 'object') {
		return false;
	}

	for (const key in attributes) {
		if (!BLOCKERA_ATTR_KEY.test(key) || BLOCKERA_META_ATTRIBUTE_KEYS[key]) {
			continue;
		}

		const current = attributes[key];
		const registeredDefault = getRegisteredDefaultValue(
			defaultAttributes,
			key
		);

		// Schema defaults may be unwrapped (`defaultWithoutValue`); stored attrs
		// still use `{ value }`. Compare both shapes.
		if (
			registeredDefault !== undefined &&
			(isEquals(current, registeredDefault) ||
				isEquals(
					unwrapBlockeraAttributeValue(current),
					unwrapBlockeraAttributeValue(registeredDefault)
				))
		) {
			continue;
		}

		if (!isEmptyBlockeraFeatureValue(current)) {
			return true;
		}
	}

	return false;
}

/**
 * Drop `blockeraId` / legacy ids and Blockera class tokens. Feature keys stay.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Attributes without identity fingerprint.
 */
export function stripBlockeraIdentity(attributes: Object): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes || {};
	}

	const strippedClasses = stripBlockeraBlockClasses(attributes.className);

	return {
		...attributes,
		blockeraId: undefined,
		blockeraPropsId: undefined,
		blockeraCompatId: undefined,
		className: strippedClasses || undefined,
	};
}

/**
 * In Advanced Mode, remove identity when no feature attributes remain.
 * Basic Mode keeps `blockeraId` even with empty features.
 *
 * @param {Object} attributes Block attributes.
 * @param {?Object} defaultAttributes Registered schema or prepared default values.
 * @return {Object} Attributes, possibly without identity.
 */
export function withoutBlockeraIdentityIfUnused(
	attributes: Object,
	defaultAttributes: ?Object
): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes || {};
	}

	if (
		isBlockeraBlockModeBasic(attributes) ||
		hasBlockeraFeatureAttributes(attributes, defaultAttributes)
	) {
		return attributes;
	}

	return stripBlockeraIdentity(attributes);
}

/**
 * Remove `blockera-block` and unique `blockera-block-*` tokens. Other classes stay.
 *
 * @param {string} className Current className.
 * @return {string} Class list without Blockera tokens.
 */
export function stripBlockeraBlockClasses(className: mixed): string {
	if (typeof className !== 'string' || !className) {
		return typeof className === 'string' ? className : '';
	}
	return className
		.split(/\s+/)
		.filter(
			(token) =>
				token &&
				token !== 'blockera-block' &&
				!BLOCKERA_UNIQUE_CLASS.test(token)
		)
		.join(' ');
}

function hasUniqueBlockeraBlockClass(className: string): boolean {
	const tokens = className.split(/\s+/).filter(Boolean);
	for (let i = 0; i < tokens.length; i++) {
		if (
			tokens[i] !== 'blockera-block' &&
			BLOCKERA_UNIQUE_CLASS.test(tokens[i])
		) {
			return true;
		}
	}
	return false;
}

/**
 * Persist `blockera-block` and `blockera-block-{blockeraId}`.
 * If a unique token already exists, leave it (do not rewrite).
 *
 * @param {Object} attributes Current attributes.
 * @return {Object} Attributes with class tokens.
 */
export function withBlockeraBlockClassFromId(attributes: Object): Object {
	const id = getBlockeraId(attributes);
	if (!id) {
		return attributes;
	}

	const unique = 'blockera-block-' + String(id);
	const current =
		typeof attributes.className === 'string' ? attributes.className : '';
	if (hasUniqueBlockeraBlockClass(current)) {
		if (current.split(/\s+/).filter(Boolean).indexOf('blockera-block') === -1) {
			return {
				...attributes,
				className: (current + ' blockera-block').trim(),
			};
		}
		return attributes;
	}

	const tokens = current.split(/\s+/).filter(Boolean);
	const nextTokens: Array<string> = [];
	let hasBase = false;

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === 'blockera-block') {
			if (!hasBase) {
				nextTokens.push(token);
				hasBase = true;
			}
			continue;
		}
		nextTokens.push(token);
	}

	if (!hasBase) {
		nextTokens.push('blockera-block');
	}
	nextTokens.push(unique);

	const className = nextTokens.join(' ');
	if (className === current) {
		return attributes;
	}

	return {
		...attributes,
		className,
	};
}

/** @deprecated Use withBlockeraBlockClassFromId. */
export const withBlockeraBlockClassFromPropsId = withBlockeraBlockClassFromId;

/**
 * Drop leftover legacy id keys when `blockeraId` already exists.
 * Unique class is not rewritten. Basic mode strips Blockera class tokens.
 * Legacy-only blocks are left for `migrateLegacyBlockeraIds` so overlay
 * does not mint a new id every render.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Normalized attributes.
 */
export function normalizeBlockeraIds(attributes: Object): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes || {};
	}

	if (!attributes.blockeraId) {
		return attributes;
	}

	const next = { ...attributes };
	delete next.blockeraPropsId;
	delete next.blockeraCompatId;

	if (isBlockeraBlockModeBasic(next)) {
		if (typeof next.className === 'string') {
			const stripped = stripBlockeraBlockClasses(next.className);
			if (stripped !== next.className) {
				next.className = stripped;
			}
		}
		return next;
	}

	return withBlockeraBlockClassFromId(next);
}

/**
 * Assign `blockeraId` when missing (or when `force`). Unique class uses that id
 * only when no unique token exists.
 *
 * @param {Object}  state      Current attributes.
 * @param {string}  identifier Attribute key (`blockeraId`; legacy keys map to it).
 * @param {boolean} force      Replace an existing value.
 * @return {Object} Attributes with the id set.
 */
export function getAttributesWithIds(
	state: Object,
	identifier: string,
	force: boolean = false
): Object {
	const key =
		identifier === 'blockeraPropsId' || identifier === 'blockeraCompatId'
			? 'blockeraId'
			: identifier;

	if (key !== 'blockeraId') {
		if (state[key] && !force) {
			return state;
		}

		const next = { ...state };
		next[key] = generateBlockeraAttributeId();
		return next;
	}

	const existing = getBlockeraId(state);
	if (existing && !force) {
		return withBlockeraBlockClassFromId({
			...state,
			blockeraId: existing,
		});
	}

	const id = generateBlockeraAttributeId();
	return withBlockeraBlockClassFromId({
		...state,
		blockeraId: id,
	});
}
