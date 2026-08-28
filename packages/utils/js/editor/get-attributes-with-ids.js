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
		const keys = Object.keys(unwrapped);

		if (keys.length === 0) {
			return true;
		}

		for (let i = 0; i < keys.length; i++) {
			if (!isEmptyBlockeraFeatureValue(unwrapped[keys[i]])) {
				return false;
			}
		}

		return true;
	}

	return false;
}

/**
 * Gutenberg registration (`sanitizeDefaultAttributes`) converts empty-array
 * defaults to `{ value: {} }`. PHP still ships `{ value: [] }`. Writing `[]`
 * fails `===` against the registered default, so the key is serialized.
 */
function normalizeRegisteredEmptyArrayDefault(value: mixed): mixed {
	if (Array.isArray(value) && value.length === 0) {
		return { value: {} };
	}

	if (value == null || typeof value !== 'object' || Array.isArray(value)) {
		return value;
	}

	const record: { [string]: mixed } = (value: any);

	if (!Array.isArray(record.value) || record.value.length !== 0) {
		return value;
	}

	if (Object.keys(record).length === 1) {
		return { value: {} };
	}

	return {
		...record,
		value: {},
	};
}

function getRegisteredDefaultValue(
	defaultAttributes: ?Object,
	key: string
): mixed {
	if (!defaultAttributes || typeof defaultAttributes !== 'object') {
		return undefined;
	}

	const entry = defaultAttributes[key];
	if (entry == null) {
		return undefined;
	}

	if (typeof entry !== 'object' || Array.isArray(entry)) {
		return normalizeRegisteredEmptyArrayDefault(entry);
	}

	const record: { [string]: mixed } = (entry: any);

	if ('type' in record && 'default' in record) {
		return normalizeRegisteredEmptyArrayDefault(record.default);
	}

	return normalizeRegisteredEmptyArrayDefault(entry);
}

/**
 * Inner-block maps from WP↔Blockera hydrate look like
 * `{ 'elements/link': { attributes: {} } }` (optionally `{ value: ... }`).
 * Empty slots do not count as used features at the top level (identity omit).
 * Nested maps keep `{ attributes: {} }` so reset items are readable as `{}`
 * without serializing leftover feature defaults.
 */
function isEmptyInnerBlocksTree(
	value: mixed,
	defaultAttributes: ?Object
): boolean {
	const unwrapped = unwrapBlockeraAttributeValue(value);

	if (unwrapped == null) {
		return true;
	}

	if (Array.isArray(unwrapped)) {
		return unwrapped.length === 0;
	}

	if (typeof unwrapped !== 'object') {
		return false;
	}

	const keys = Object.keys(unwrapped);

	if (keys.length === 0) {
		return true;
	}

	for (let i = 0; i < keys.length; i++) {
		const item = unwrapped[keys[i]];

		// Repeaters (text-shadow, box-shadow, …) are `{ 0: { x, y, … } }`
		// without an `attributes` key. Those are not inner-block slots.
		if (
			!item ||
			typeof item !== 'object' ||
			Array.isArray(item) ||
			!('attributes' in item)
		) {
			return false;
		}

		if (
			hasBlockeraFeatureAttributes(
				(item: any).attributes || {},
				defaultAttributes
			)
		) {
			return false;
		}
	}

	return true;
}

const BLOCKERA_BLOCK_STATES_KEY = 'blockeraBlockStates';
const BLOCKERA_INNER_BLOCKS_KEY = 'blockeraInnerBlocks';
const BLOCK_STATE_KNOWN_KEYS: { [string]: boolean } = {
	breakpoints: true,
	isVisible: true,
	'css-class': true,
	content: true,
};

function isEmptyArrayOrEmptyObject(value: mixed): boolean {
	if (value == null) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.length === 0;
	}

	if (typeof value === 'object') {
		return Object.keys(value).length === 0;
	}

	return false;
}

function isMeaningfulStateFlag(value: mixed): boolean {
	if (value === false) {
		return true;
	}

	if (typeof value === 'string' && value !== '') {
		return true;
	}

	if (value != null && typeof value === 'object') {
		return !isEmptyArrayOrEmptyObject(value);
	}

	return false;
}

/**
 * Keep inner-block item keys after reset with `{ attributes: {} }` so readers
 * get an empty object. Do not fill schema defaults into that object.
 */
function normalizeInnerBlocksTree(
	value: mixed,
	defaultAttributes: ?Object
): mixed {
	if (value == null) {
		return value;
	}

	const unwrapped = unwrapBlockeraAttributeValue(value);

	if (isEmptyArrayOrEmptyObject(unwrapped)) {
		const empty = wrapBlockStatesValue(value, {});

		return isEquals(value, empty) ? value : empty;
	}

	if (typeof unwrapped !== 'object') {
		return value;
	}

	const items: { [string]: mixed } = (unwrapped: any);
	const nextItems: { [string]: mixed } = {};
	let changed = false;

	for (const itemId in items) {
		const item = items[itemId];

		if (item == null || typeof item !== 'object' || Array.isArray(item)) {
			nextItems[itemId] = item;
			continue;
		}

		const record: { [string]: mixed } = (item: any);
		const prunedAttributes = pruneNestedFeatureAttributes(
			record.attributes,
			defaultAttributes
		);

		if (Object.keys(prunedAttributes).length === 0) {
			const emptySlot = { attributes: {} };
			nextItems[itemId] = emptySlot;

			if (!isEquals(record, emptySlot)) {
				changed = true;
			}

			continue;
		}

		if (!isEquals(record.attributes, prunedAttributes)) {
			changed = true;
			nextItems[itemId] = {
				...record,
				attributes: prunedAttributes,
			};
			continue;
		}

		nextItems[itemId] = record;
	}

	if (
		!changed &&
		Object.keys(nextItems).length === Object.keys(items).length
	) {
		return value;
	}

	const wrapped = wrapBlockStatesValue(value, nextItems);

	return isEquals(value, wrapped) ? value : wrapped;
}

/**
 * Nested breakpoint/state attribute maps are not Gutenberg-registered keys.
 * Unused Blockera features are dropped (not reset to defaults).
 * Empty inner-block item slots keep `{ attributes: {} }` (no feature defaults).
 */
function pruneNestedFeatureAttributes(
	attributes: mixed,
	defaultAttributes: ?Object
): Object {
	if (attributes == null || typeof attributes !== 'object') {
		return {};
	}

	if (Array.isArray(attributes)) {
		return attributes.length === 0 ? {} : { ...attributes };
	}

	const record: { [string]: mixed } = (attributes: any);
	const next: { [string]: mixed } = {};

	for (const key in record) {
		if (!BLOCKERA_ATTR_KEY.test(key) || BLOCKERA_META_ATTRIBUTE_KEYS[key]) {
			if (!isEmptyBlockeraFeatureValue(record[key])) {
				next[key] = record[key];
			}
			continue;
		}

		if (key === BLOCKERA_INNER_BLOCKS_KEY) {
			const normalized = normalizeInnerBlocksTree(
				record[key],
				defaultAttributes
			);
			const unwrapped = unwrapBlockeraAttributeValue(normalized);

			if (
				unwrapped &&
				typeof unwrapped === 'object' &&
				!Array.isArray(unwrapped) &&
				Object.keys(unwrapped).length > 0
			) {
				next[key] = normalized;
			}

			continue;
		}

		if (key === BLOCKERA_BLOCK_STATES_KEY) {
			const normalized = normalizeBlockeraBlockStatesValue(
				record[key],
				defaultAttributes
			);

			if (!isEmptyBlockStatesValue(normalized, defaultAttributes)) {
				next[key] = normalized;
			}

			continue;
		}

		if (
			isUnusedBlockeraFeatureValue(
				record[key],
				getRegisteredDefaultValue(defaultAttributes, key),
				defaultAttributes,
				key
			)
		) {
			continue;
		}

		next[key] = record[key];
	}

	return next;
}

function isEmptyBreakpointAttributes(
	attributes: mixed,
	defaultAttributes: ?Object
): boolean {
	if (isEmptyArrayOrEmptyObject(attributes)) {
		return true;
	}

	if (typeof attributes !== 'object') {
		return false;
	}

	const pruned = pruneNestedFeatureAttributes(attributes, defaultAttributes);

	return Object.keys(pruned).length === 0;
}

function stateHasUnknownKeys(state: Object): boolean {
	for (const key in state) {
		if (!BLOCK_STATE_KNOWN_KEYS[key]) {
			return true;
		}
	}

	return false;
}

function isEmptyBlockStateEntry(
	state: mixed,
	defaultAttributes: ?Object
): boolean {
	if (state == null) {
		return true;
	}

	if (typeof state !== 'object' || Array.isArray(state)) {
		return false;
	}

	const record: { [string]: mixed } = (state: any);

	if (stateHasUnknownKeys(record)) {
		return false;
	}

	if (record.isVisible === false) {
		return false;
	}

	if (isMeaningfulStateFlag(record['css-class'])) {
		return false;
	}

	if (isMeaningfulStateFlag(record.content)) {
		return false;
	}

	const breakpoints = record.breakpoints;

	if (isEmptyArrayOrEmptyObject(breakpoints)) {
		return true;
	}

	if (typeof breakpoints !== 'object') {
		return false;
	}

	const breakpointMap: { [string]: mixed } = (breakpoints: any);

	for (const breakpointType in breakpointMap) {
		const breakpoint = breakpointMap[breakpointType];

		if (breakpoint == null) {
			continue;
		}

		if (typeof breakpoint !== 'object' || Array.isArray(breakpoint)) {
			if (!isEmptyArrayOrEmptyObject(breakpoint)) {
				return false;
			}
			continue;
		}

		if (
			!isEmptyBreakpointAttributes(
				(breakpoint: any).attributes,
				defaultAttributes
			)
		) {
			return false;
		}
	}

	return true;
}

/**
 * True when every state/breakpoint slot is empty, including PHP `attributes: []`.
 */
export function isEmptyBlockStatesValue(
	value: mixed,
	defaultAttributes: ?Object
): boolean {
	const unwrapped = unwrapBlockeraAttributeValue(value);

	if (isEmptyArrayOrEmptyObject(unwrapped)) {
		return true;
	}

	if (typeof unwrapped !== 'object') {
		return false;
	}

	const states: { [string]: mixed } = (unwrapped: any);

	for (const stateId in states) {
		if (!isEmptyBlockStateEntry(states[stateId], defaultAttributes)) {
			return false;
		}
	}

	return true;
}

function wrapBlockStatesValue(original: mixed, unwrappedNext: Object): Object {
	if (
		original != null &&
		typeof original === 'object' &&
		!Array.isArray(original) &&
		'value' in (original: any)
	) {
		return { value: unwrappedNext };
	}

	return unwrappedNext;
}

function pruneBlockStateBreakpoints(
	breakpoints: mixed,
	defaultAttributes: ?Object
): { next: { [string]: Object }, changed: boolean } {
	if (breakpoints == null) {
		return { next: {}, changed: false };
	}

	if (Array.isArray(breakpoints) && breakpoints.length === 0) {
		return { next: {}, changed: true };
	}

	if (
		typeof breakpoints === 'object' &&
		!Array.isArray(breakpoints) &&
		Object.keys(breakpoints).length === 0
	) {
		return { next: {}, changed: false };
	}

	if (typeof breakpoints !== 'object') {
		return { next: {}, changed: true };
	}

	const breakpointMap: { [string]: mixed } = (breakpoints: any);
	const next: { [string]: Object } = {};
	let changed = false;

	for (const breakpointType in breakpointMap) {
		const breakpoint = breakpointMap[breakpointType];

		if (breakpoint == null) {
			changed = true;
			continue;
		}

		if (typeof breakpoint !== 'object' || Array.isArray(breakpoint)) {
			if (!isEmptyArrayOrEmptyObject(breakpoint)) {
				next[breakpointType] = breakpoint;
			} else {
				changed = true;
			}
			continue;
		}

		const record: { [string]: mixed } = (breakpoint: any);
		const prunedAttributes = pruneNestedFeatureAttributes(
			record.attributes,
			defaultAttributes
		);

		if (Object.keys(prunedAttributes).length === 0) {
			const emptySlot = {
				...record,
				attributes: {},
			};

			if (!isEquals(record, emptySlot)) {
				changed = true;
			}

			next[breakpointType] = emptySlot;
			continue;
		}

		if (!isEquals(record.attributes, prunedAttributes)) {
			changed = true;
			next[breakpointType] = {
				...record,
				attributes: prunedAttributes,
			};
			continue;
		}

		next[breakpointType] = record;
	}

	if (
		!changed &&
		Object.keys(next).length !== Object.keys(breakpointMap).length
	) {
		changed = true;
	}

	return { next, changed };
}

/**
 * Keep empty `{ attributes: {} }` breakpoint slots after reset. Drop a
 * state only when it has no breakpoint keys (and no content / css-class).
 * Empty-only `blockeraBlockStates` still collapse via isEmptyBlockStatesValue.
 */
export function normalizeBlockeraBlockStatesValue(
	value: mixed,
	defaultAttributes: ?Object
): mixed {
	if (value == null) {
		return value;
	}

	const hadWrapper =
		typeof value === 'object' &&
		!Array.isArray(value) &&
		'value' in (value: any);
	const unwrapped = unwrapBlockeraAttributeValue(value);

	if (isEmptyArrayOrEmptyObject(unwrapped)) {
		const empty = hadWrapper ? { value: {} } : {};

		return isEquals(value, empty) ? value : empty;
	}

	if (typeof unwrapped !== 'object') {
		return value;
	}

	const states: { [string]: mixed } = (unwrapped: any);
	const nextStates: { [string]: mixed } = {};
	let changed = false;

	for (const stateId in states) {
		const state = states[stateId];

		if (state === undefined) {
			nextStates[stateId] = undefined;
			changed = true;
			continue;
		}

		if (state == null || typeof state !== 'object' || Array.isArray(state)) {
			nextStates[stateId] = state;
			continue;
		}

		const record: { [string]: mixed } = (state: any);
		const prunedBreakpoints = pruneBlockStateBreakpoints(
			record.breakpoints,
			defaultAttributes
		);

		if (prunedBreakpoints.changed) {
			changed = true;
		}

		const nextState = prunedBreakpoints.changed
			? {
					...record,
					breakpoints: prunedBreakpoints.next,
				}
			: record;

		if (isEmptyBlockStateEntry(nextState, defaultAttributes)) {
			const breakpoints = (nextState: any)?.breakpoints;
			const hasBreakpointSlots =
				breakpoints &&
				typeof breakpoints === 'object' &&
				!Array.isArray(breakpoints) &&
				Object.keys(breakpoints).length > 0;

			// Reset slots stay as `{ attributes: {} }` so readers can assert
			// empty objects. Drop the state only when no breakpoint keys remain.
			if (!hasBreakpointSlots) {
				changed = true;
				continue;
			}
		}

		nextStates[stateId] = nextState;
	}

	if (!changed && Object.keys(nextStates).length === Object.keys(states).length) {
		return value;
	}

	const wrapped = wrapBlockStatesValue(value, nextStates);

	return isEquals(value, wrapped) ? value : wrapped;
}

/**
 * True when any state still has breakpoint keys (including `{ attributes: {} }`
 * reset slots). Used so omitUnused does not wipe those slots to `{ value: {} }`.
 */
function blockStatesTreeHasBreakpointSlots(value: mixed): boolean {
	const unwrapped = unwrapBlockeraAttributeValue(value);

	if (unwrapped == null || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) {
		return false;
	}

	const states: { [string]: mixed } = (unwrapped: any);

	for (const stateId in states) {
		const state = states[stateId];

		if (state == null || typeof state !== 'object' || Array.isArray(state)) {
			continue;
		}

		const breakpoints = (state: any).breakpoints;

		if (
			breakpoints &&
			typeof breakpoints === 'object' &&
			!Array.isArray(breakpoints) &&
			Object.keys(breakpoints).length > 0
		) {
			return true;
		}
	}

	return false;
}

function isUnusedBlockeraFeatureValue(
	current: mixed,
	registeredDefault: mixed,
	defaultAttributes: ?Object,
	key?: string
): boolean {
	if (current === undefined) {
		return true;
	}

	if (registeredDefault !== undefined) {
		if (isEquals(current, registeredDefault)) {
			return true;
		}

		if (
			isEquals(
				unwrapBlockeraAttributeValue(current),
				unwrapBlockeraAttributeValue(registeredDefault)
			)
		) {
			return true;
		}
	}

	if (key === BLOCKERA_BLOCK_STATES_KEY) {
		return isEmptyBlockStatesValue(current, defaultAttributes);
	}

	if (key === BLOCKERA_INNER_BLOCKS_KEY) {
		return isEmptyInnerBlocksTree(current, defaultAttributes);
	}

	return isEmptyBlockeraFeatureValue(current);
}

/**
 * True when any non-meta `blockera*` attribute still has a real value.
 *
 * Meta keys (`blockeraId`, legacy ids, `blockeraBlockMode`) do not count.
 * Values equal to the registered default do not count (e.g. `{ value: 'none' }`).
 * Empty wrappers, `''`, `[]`, `{}`, and empty inner-block slots do not count.
 * `0` and `false` do.
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

		if (
			!isUnusedBlockeraFeatureValue(
				attributes[key],
				getRegisteredDefaultValue(defaultAttributes, key),
				defaultAttributes,
				key
			)
		) {
			return true;
		}
	}

	return false;
}

/**
 * Gutenberg omits attributes that strictly equal the registered default.
 * Unused/wrong-shape values are reset to that default (not `undefined`).
 *
 * @param {Object} attributes Block attributes.
 * @param {?Object} defaultAttributes Registered schema or prepared default values.
 * @return {Object} Attributes with unused Blockera features set to schema defaults.
 */
export function omitUnusedBlockeraFeatureAttributes(
	attributes: Object,
	defaultAttributes: ?Object
): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes || {};
	}

	let next = null;

	for (const key in attributes) {
		if (!BLOCKERA_ATTR_KEY.test(key) || BLOCKERA_META_ATTRIBUTE_KEYS[key]) {
			continue;
		}

		const registeredDefault = getRegisteredDefaultValue(
			defaultAttributes,
			key
		);

		const current =
			key === BLOCKERA_BLOCK_STATES_KEY
				? normalizeBlockeraBlockStatesValue(
						attributes[key],
						defaultAttributes
					)
				: key === BLOCKERA_INNER_BLOCKS_KEY
					? normalizeInnerBlocksTree(
							attributes[key],
							defaultAttributes
						)
					: attributes[key];

		if (
			!isUnusedBlockeraFeatureValue(
				current,
				registeredDefault,
				defaultAttributes,
				key
			)
		) {
			if (
				(key === BLOCKERA_BLOCK_STATES_KEY ||
					key === BLOCKERA_INNER_BLOCKS_KEY) &&
				current !== attributes[key]
			) {
				if (!next) {
					next = { ...attributes };
				}
				next[key] = current;
			}
			continue;
		}

		if (
			key === BLOCKERA_BLOCK_STATES_KEY &&
			blockStatesTreeHasBreakpointSlots(current)
		) {
			if (current !== attributes[key]) {
				if (!next) {
					next = { ...attributes };
				}
				next[key] = current;
			}
			continue;
		}

		if (registeredDefault === undefined) {
			if (attributes[key] !== undefined) {
				if (!next) {
					next = { ...attributes };
				}
				next[key] = undefined;
			}
			continue;
		}

		if (isEquals(attributes[key], registeredDefault)) {
			continue;
		}

		if (!next) {
			next = { ...attributes };
		}

		next[key] = registeredDefault;
	}

	return next || attributes;
}

/**
 * Remove nested empty objects/arrays from WordPress `style` trees.
 *
 * PHP JSON round-trips empty objects as `[]` (`color: []`, `elements.link.color: []`).
 * Those must be dropped so Gutenberg omits them. Non-empty arrays (e.g. duotone)
 * are kept. Falsy scalars (`''`, `0`, `false`) are kept.
 *
 * @see source-codes/block-editor/packages/block-editor/src/hooks/utils.js `cleanEmptyObject`
 *
 * @param {*} object Nested value.
 * @return {*} Cleaned value, or `undefined` when the tree is empty.
 */
export function cleanEmptyObject(object: mixed): mixed {
	if (Array.isArray(object)) {
		return object.length === 0 ? undefined : object;
	}

	if (object === null || typeof object !== 'object') {
		return object;
	}

	const record: { [string]: mixed } = (object: any);
	const keys = Object.keys(record);
	let next: { [string]: mixed } | null = null;

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const value = record[key];
		const cleaned = cleanEmptyObject(value);

		if (cleaned === undefined) {
			if (!next) {
				next = { ...record };
			}
			delete next[key];
			continue;
		}

		if (cleaned !== value) {
			if (!next) {
				next = { ...record };
			}
			next[key] = cleaned;
		}
	}

	if (next) {
		return Object.keys(next).length ? next : undefined;
	}

	return keys.length ? record : undefined;
}

/**
 * Deep-clean WordPress `style` so empty branches do not serialize.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Attributes with an empty `style` tree unset.
 */
export function withCleanedWpStyle(attributes: Object): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes;
	}

	if (!('style' in attributes)) {
		return attributes;
	}

	const cleanedStyle = cleanEmptyObject(attributes.style);

	if (cleanedStyle === attributes.style) {
		return attributes;
	}

	return {
		...attributes,
		style: cleanedStyle,
	};
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
 * Reset unused Blockera feature keys to registered defaults so Gutenberg
 * omits them from markup. In Advanced Mode, also remove identity when no
 * feature attributes remain. Basic Mode keeps `blockeraId`.
 *
 * @param {Object} attributes Block attributes.
 * @param {?Object} defaultAttributes Registered schema or prepared default values.
 * @return {Object} Attributes with unused features normalized (and maybe identity stripped).
 */
export function withoutBlockeraIdentityIfUnused(
	attributes: Object,
	defaultAttributes: ?Object
): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes || {};
	}

	const next = withCleanedWpStyle(
		omitUnusedBlockeraFeatureAttributes(attributes, defaultAttributes)
	);

	if (
		isBlockeraBlockModeBasic(next) ||
		hasBlockeraFeatureAttributes(next, defaultAttributes)
	) {
		return next;
	}

	return stripBlockeraIdentity(next);
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

/**
 * Mint a new `blockeraId` and rewrite the unique class to match.
 *
 * Use after Gutenberg duplicate/copy, where attributes (including identity)
 * are cloned onto a new clientId. `getAttributesWithIds(..., true)` keeps an
 * existing unique class, which would leave both blocks sharing a selector.
 *
 * @param {Object} attributes Current attributes.
 * @return {Object} Attributes with a new id and matching unique class.
 */
export function remintBlockeraIdentity(attributes: Object): Object {
	if (!attributes || typeof attributes !== 'object') {
		return attributes || {};
	}

	const next = { ...attributes };
	next.blockeraId = generateBlockeraAttributeId();
	next.blockeraPropsId = undefined;
	next.blockeraCompatId = undefined;

	const stripped = stripBlockeraBlockClasses(next.className);

	return withBlockeraBlockClassFromId({
		...next,
		className: stripped || undefined,
	});
}
