// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

export const DEFAULT_TEXT_ALIGN_VALUE = '';

/**
 * Gutenberg / Blockera text-align tokens (inspector + `blockeraTextAlign`).
 */
export const TEXT_ALIGN_VALUES: Array<{
	label: string,
	value: string,
}> = [
	{
		label: __('Left', 'blockera'),
		value: 'left',
	},
	{
		label: __('Center', 'blockera'),
		value: 'center',
	},
	{
		label: __('Right', 'blockera'),
		value: 'right',
	},
	{
		label: __('Justify', 'blockera'),
		value: 'justify',
	},
	{
		label: __('None', 'blockera'),
		value: 'initial',
	},
];
