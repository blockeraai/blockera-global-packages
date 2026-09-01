// @flow

/**
 * Blockera dependencies
 */
import { mergeObject } from '@blockera/utils';

const AUTO_HEIGHT = 'auto';

/**
 * Unwrap a Blockera attribute to a comparable CSS/control value.
 *
 * @param {*} value Attribute value (plain, `{ value }`, or value addon).
 * @return {string} Normalized string; `__value_addon__` for addon objects.
 */
export function getNormalizedDimensionValue(value: any): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value === 'object') {
		if (value.isValueAddon) {
			return '__value_addon__';
		}

		return getNormalizedDimensionValue(value.value);
	}

	return String(value);
}

/**
 * Whether a width change should be ignored (cleared / empty).
 *
 * @param {*} newValue Incoming `blockeraWidth` value.
 * @return {boolean} True when there is no width to persist against.
 */
export function isEmptyWidthValue(newValue: any): boolean {
	return getNormalizedDimensionValue(newValue) === '';
}

/**
 * Empty, default, or already-auto height may be overwritten with `auto`.
 *
 * @param {*} height Current `blockeraHeight`.
 * @return {boolean} True when height should become `auto`.
 */
export function shouldPersistAutoHeight(height: any): boolean {
	const normalized = getNormalizedDimensionValue(height);

	return normalized === '' || normalized === AUTO_HEIGHT;
}

/**
 * Persist `blockeraHeight: auto` when core/icon width (or aliased icon size) is set
 * on the master block in the normal/base state. Other states and breakpoints inherit
 * that height, so they are left untouched. Custom heights are not overwritten.
 *
 * @param {Object} nextState Accumulated attributes.
 * @param {string} featureId Feature being updated.
 * @param {*}      newValue  New feature value.
 * @param {Object} [blockDetail] Block context from the attributes reducer.
 * @return {Object} Updated attributes.
 */
export function applyCoreIconWidthHeightCompatibility(
	nextState: Object,
	featureId: string,
	newValue: any,
	blockDetail?: Object
): Object {
	if (
		featureId !== 'blockeraWidth' ||
		isEmptyWidthValue(newValue) ||
		blockDetail?.isMasterBlock === false ||
		blockDetail?.isMasterNormalState === false ||
		!shouldPersistAutoHeight(nextState?.blockeraHeight)
	) {
		return nextState;
	}

	return mergeObject(nextState, {
		blockeraHeight: { value: AUTO_HEIGHT },
	});
}
