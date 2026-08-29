// @flow

/**
 * External dependencies
 */
import { select } from '@wordpress/data';

/**
 * Blockera dependencies
 */
import {
	hasInvolvesSomeItems,
	isEmpty,
	hasBlockeraFeatureAttributes,
} from '@blockera/utils';

/**
 * Drop empty / undefined overlay keys so reset `{ attributes: {} }` slots
 * (and leftover `undefined` after deletedProps) do not replace inner-normal.
 */
export function overlayInnerAttributes(nested: mixed): Object {
	if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
		return {};
	}

	const record: { [string]: mixed } = (nested: any);
	const next: { [string]: mixed } = {};

	for (const key in record) {
		const value = record[key];

		if (value === undefined || value === null) {
			continue;
		}

		if (isEmpty(value)) {
			continue;
		}

		next[key] = value;
	}

	return hasBlockeraFeatureAttributes(next) ? next : {};
}

export function overlayInnerNormalFeatures(nested: mixed): Object {
	const overlay = overlayInnerAttributes(nested);
	const features: { [string]: mixed } = {};

	for (const key in overlay) {
		// Nested states belong to inner pseudo-states, not inner-normal inherit.
		if (key === 'blockeraBlockStates' || key === 'blockeraInnerBlocks') {
			continue;
		}

		features[key] = overlay[key];
	}

	return features;
}

export function mergeRootWithInnerOverlay(
	rootInnerBlock: mixed,
	nested: mixed
): Object {
	const root =
		rootInnerBlock &&
		typeof rootInnerBlock === 'object' &&
		!Array.isArray(rootInnerBlock)
			? rootInnerBlock
			: {};

	return {
		...root,
		...overlayInnerNormalFeatures(nested),
	};
}

/**
 * True when the master-state overlay actually stores this feature (not inherit).
 */
export function overlayHasFeatureValue(
	nested: mixed,
	attribute: string
): boolean {
	if (
		!nested ||
		typeof nested !== 'object' ||
		Array.isArray(nested) ||
		!attribute
	) {
		return false;
	}

	const value = (nested: any)[attribute];

	return value !== undefined && value !== null && !isEmpty(value);
}

export const blockHasStates = (attributes: Object): boolean => {
	const { getStates } = select('blockera/editor');
	const statesDefinition = getStates();
	const stateTypes = Object.keys(statesDefinition);

	return hasInvolvesSomeItems(
		attributes?.blockeraBlockStates || {},
		stateTypes
	);
};
