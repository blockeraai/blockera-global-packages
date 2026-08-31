// @flow

/**
 * Blockera dependencies
 */
import { isEmptyObject } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { ignoreBlockeraAttributeKeysRegExp } from '../libs/attribute-key-patterns';

const BLOCKERA_FEATURE_KEY = ignoreBlockeraAttributeKeysRegExp();

const SKIP_FLUSH_KEYS = new Set([
	'className',
	'blockeraId',
	'blockeraCompatId',
	'blockeraBlockMode',
	'blockeraCurrentDevice',
	'blockeraPropsId',
]);

function unwrapFeature(value: mixed): mixed {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const asObject: { [string]: mixed } = (value: any);
		if ('value' in asObject) {
			return asObject.value;
		}
	}

	return value;
}

function isClearedFeatureValue(value: mixed): boolean {
	if (value == null) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.length === 0;
	}

	if (typeof value === 'object') {
		return isEmptyObject(value);
	}

	if (typeof value === 'string') {
		return value === '';
	}

	return false;
}

function hasExplicitNull(node: mixed, depth: number = 0): boolean {
	if (node === null) {
		return true;
	}

	if (depth > 5 || !node || typeof node !== 'object') {
		return false;
	}

	const asObject: { [string]: mixed } = (node: any);
	for (const key of Object.keys(asObject)) {
		if (hasExplicitNull(asObject[key], depth + 1)) {
			return true;
		}
	}

	return false;
}

function isBlockeraFeatureKey(key: string): boolean {
	return BLOCKERA_FEATURE_KEY.test(key);
}

/**
 * Immediate WP entity persist is required for user-origin resets. JSON omits
 * `undefined`, so a delayed write lets merged GS fall back to theme.json and
 * WP→Blockera hydrate restores the feature. Populated edits stay debounced so
 * inspector popovers are not remounted on every keystroke.
 *
 * @param {Object} persistableAttributes Next GS attributes (pre-normalize).
 * @param {Object} currentUserBlock Stored `userStyles` block slice.
 * @return {boolean} Whether to call the entity persist in this tick.
 */
export function shouldFlushGlobalStylesEntityNow(
	persistableAttributes: Object,
	currentUserBlock: Object
): boolean {
	if (!persistableAttributes || typeof persistableAttributes !== 'object') {
		return false;
	}

	if (hasExplicitNull(persistableAttributes)) {
		return true;
	}

	const current =
		currentUserBlock && typeof currentUserBlock === 'object'
			? currentUserBlock
			: {};

	for (const key of Object.keys(persistableAttributes)) {
		if (SKIP_FLUSH_KEYS.has(key)) {
			continue;
		}

		if (isBlockeraFeatureKey(key)) {
			const nextVal = unwrapFeature(persistableAttributes[key]);
			const prevVal = unwrapFeature(current[key]);

			if (
				isClearedFeatureValue(nextVal) &&
				!isClearedFeatureValue(prevVal)
			) {
				return true;
			}

			continue;
		}

		const nextTree = persistableAttributes[key];
		const prevTree = current[key];

		if (
			nextTree &&
			typeof nextTree === 'object' &&
			!Array.isArray(nextTree) &&
			isEmptyObject(nextTree) &&
			prevTree &&
			typeof prevTree === 'object' &&
			!isEmptyObject(prevTree)
		) {
			return true;
		}
	}

	for (const key of Object.keys(current)) {
		if (SKIP_FLUSH_KEYS.has(key) || !isBlockeraFeatureKey(key)) {
			continue;
		}

		if (
			persistableAttributes[key] === undefined &&
			!isClearedFeatureValue(unwrapFeature(current[key]))
		) {
			return true;
		}
	}

	return false;
}
