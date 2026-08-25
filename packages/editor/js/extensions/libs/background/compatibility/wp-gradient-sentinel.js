// @flow

/**
 * Blockera dependencies
 */
import { isString } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { getWpFromStyleOrGlobal } from '../../utils';

export const WP_GRADIENT_NONE: string = 'none';
export const WP_GRADIENT_TRANSPARENT_NONE: string = 'transparent none';

export type WpGradientSentinelKind = 'none' | 'transparent-none';

/**
 * WP stores non-gradient background shorthands in color.gradient in some cases.
 * Match after trim() only.
 */
export function normalizeWpGradientSentinel(
	value: mixed
): false | WpGradientSentinelKind {
	if (!isString(value)) {
		return false;
	}

	//$FlowFixMe — isString narrows at runtime.
	const trimmed: string = value.trim();

	if (trimmed === WP_GRADIENT_NONE) {
		return 'none';
	}

	if (trimmed === WP_GRADIENT_TRANSPARENT_NONE) {
		return 'transparent-none';
	}

	return false;
}

export function createNoneBackgroundLayer(): Object {
	return {
		type: 'none',
		isVisible: true,
		order: 0,
	};
}

export function resolveWpGradientRawString(
	attributes: Object
): ?string {
	const preset = isString(attributes?.gradient) ? attributes.gradient : null;
	const styleGradient = isString(attributes?.style?.color?.gradient)
		? attributes.style.color.gradient
		: null;
	const globalGradient = isString(attributes?.color?.gradient)
		? attributes.color.gradient
		: null;

	const gradient = getWpFromStyleOrGlobal(
		preset || styleGradient,
		globalGradient
	);

	return isString(gradient) ? gradient : null;
}

export function resolveElementWpGradientRawString(
	attributes: Object,
	dataCompatibilityElement: string
): ?string {
	const gradient = getWpFromStyleOrGlobal(
		attributes?.style?.elements?.[dataCompatibilityElement]?.color?.gradient,
		attributes?.elements?.[dataCompatibilityElement]?.color?.gradient
	);

	return isString(gradient) ? gradient : null;
}
