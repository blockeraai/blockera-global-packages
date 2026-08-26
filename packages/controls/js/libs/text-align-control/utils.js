// @flow
/**
 * External dependencies
 */
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import { Icon } from '@blockera/icons';

/**
 * Internal dependencies
 */
import { TEXT_ALIGN_VALUES } from './constants';

export type TextAlignSelectOption = {
	label: string,
	value: string,
	icon: MixedElement,
};

const TEXT_ALIGN_ICON: { [string]: string } = {
	left: 'text-align-left',
	center: 'text-align-center',
	right: 'text-align-right',
	justify: 'text-align-justify',
};

/**
 * Toggle-select options for Blockera text align (icons + labels).
 *
 * @param {number} iconSize Icon pixel size.
 * @return {Array<TextAlignSelectOption>} Options.
 */
export function getTextAlignSelectOptions(
	iconSize: number = 18
): Array<TextAlignSelectOption> {
	return TEXT_ALIGN_VALUES.map((item) => {
		const iconName = TEXT_ALIGN_ICON[item.value];

		return {
			label: item.label,
			value: item.value,
			icon: iconName ? (
				<Icon icon={iconName} iconSize={iconSize} />
			) : (
				<Icon library="wp" icon="close-small" iconSize={iconSize} />
			),
		};
	});
}
