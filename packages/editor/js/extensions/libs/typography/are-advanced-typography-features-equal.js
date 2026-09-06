// @flow

/**
 * Internal dependencies
 */
import { areExtensionPropsEqual } from '../shared/are-extension-props-equal';

const ADVANCED_VALUE_KEYS = [
	'blockeraLetterSpacing',
	'blockeraWordSpacing',
	'blockeraTextIndent',
	'blockeraTextShadow',
	'blockeraTextTransform',
	'blockeraTextDecoration',
	'blockeraDirection',
	'blockeraTextOrientation',
	'blockeraTextColumns',
	'blockeraTextStroke',
	'blockeraTextWrap',
	'blockeraWordBreak',
];

export function pickAdvancedTypographyValues(values: ?Object): Object {
	const picked: Object = {};

	if (!values) {
		return picked;
	}

	for (let i = 0; i < ADVANCED_VALUE_KEYS.length; i++) {
		const key = ADVANCED_VALUE_KEYS[i];
		picked[key] = values[key];
	}

	return picked;
}

/**
 * Skip advanced typography when Font Size (or other non-advanced keys) change.
 * `block` often embeds current attributes; compare identity only.
 *
 * @param {Object} prev
 * @param {Object} next
 * @return {boolean} True when React.memo should skip.
 */
export function areAdvancedTypographyFeaturesEqual(
	prev: Object,
	next: Object
): boolean {
	return areExtensionPropsEqual(
		{
			...prev,
			values: pickAdvancedTypographyValues(prev.values),
			block: {
				clientId: prev.block?.clientId,
				blockName: prev.block?.blockName,
			},
		},
		{
			...next,
			values: pickAdvancedTypographyValues(next.values),
			block: {
				clientId: next.block?.clientId,
				blockName: next.block?.blockName,
			},
		}
	);
}
