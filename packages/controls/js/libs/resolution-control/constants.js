// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { TSelectOptions } from '../select-control/types';

export const DEFAULT_RESOLUTION_VALUE = 'full';

/**
 * Gutenberg fallback when `core/block-editor` has no `imageSizes`
 * (`packages/block-editor/src/store/defaults.js`).
 */
export const DEFAULT_RESOLUTION_OPTIONS: TSelectOptions = [
	{
		label: __('Thumbnail', 'blockera'),
		value: 'thumbnail',
	},
	{
		label: __('Medium', 'blockera'),
		value: 'medium',
	},
	{
		label: __('Large', 'blockera'),
		value: 'large',
	},
	{
		label: __('Full Size', 'blockera'),
		value: 'full',
	},
];
