// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import { isObject } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { getSelectedSelectOption } from '../select-control/utils';
import type { TSelectOptions } from '../select-control/types';
import type { AspectRatioValue } from './types';

export const DEFAULT_ASPECT_RATIO_VALUE: AspectRatioValue = {
	val: '',
	width: '',
	height: '',
};

export const CORE_WP_ASPECT_RATIO_VALUES: $ReadOnlyArray<string> = [
	'1',
	'4/3',
	'3/4',
	'3/2',
	'2/3',
	'16/9',
	'9/16',
];

const ASPECT_RATIO_SELECT_OPTIONS: TSelectOptions = [
	{
		label: __('Original', 'blockera'),
		value: '',
	},
	{
		label: __('Square 1:1', 'blockera'),
		value: '1',
	},
	{
		label: __('Standard 4:3', 'blockera'),
		value: '4/3',
	},
	{
		label: __('Portrait 3:4', 'blockera'),
		value: '3/4',
	},
	{
		label: __('Landscape 3:2', 'blockera'),
		value: '3/2',
	},
	{
		label: __('Classic Portrait 2:3', 'blockera'),
		value: '2/3',
	},
	{
		label: __('Widescreen 16:9', 'blockera'),
		value: '16/9',
	},
	{
		label: __('Tall 9:16', 'blockera'),
		value: '9/16',
	},
	{
		label: __('Custom', 'blockera'),
		value: 'custom',
	},
];

export function getAspectRatioSelectOptions(): TSelectOptions {
	return ASPECT_RATIO_SELECT_OPTIONS;
}

/**
 * Normalize aspect ratio from state graph / attributes
 * (may be `{ value: { … } }` or flat).
 */
export function unwrapAspectRatio(raw: mixed): AspectRatioValue {
	if (!isObject(raw)) {
		return { ...DEFAULT_ASPECT_RATIO_VALUE };
	}

	const anyRaw: any = raw;
	const inner = isObject(anyRaw.value) ? anyRaw.value : anyRaw;
	const o: any = inner;

	let val = '';
	if (o.val !== undefined && o.val !== null && o.val !== '') {
		val = String(o.val);
	} else if (typeof o.value === 'string' || typeof o.value === 'number') {
		val = String(o.value);
	}

	return {
		val,
		width: o.width !== undefined && o.width !== null ? String(o.width) : '',
		height:
			o.height !== undefined && o.height !== null ? String(o.height) : '',
	};
}

export function isEmptyAspectRatio(raw: mixed): boolean {
	const { val } = unwrapAspectRatio(raw);
	return val === '';
}

/**
 * Map a WP `aspectRatio` string onto the Blockera ratio object.
 */
export function aspectRatioFromWpValue(aspectRatio: mixed): AspectRatioValue {
	if (
		typeof aspectRatio !== 'string' ||
		!aspectRatio ||
		aspectRatio === 'auto'
	) {
		return { ...DEFAULT_ASPECT_RATIO_VALUE };
	}

	if (CORE_WP_ASPECT_RATIO_VALUES.includes(aspectRatio)) {
		return {
			val: aspectRatio,
			width: '',
			height: '',
		};
	}

	if (aspectRatio.includes('/')) {
		const [width, height] = aspectRatio
			.split('/')
			.map((part) => part.trim());

		return {
			val: 'custom',
			width: width || '',
			height: height || '',
		};
	}

	return {
		val: 'custom',
		width: aspectRatio,
		height: aspectRatio,
	};
}

/**
 * State-graph / changeset row preview: predefined → option label;
 * custom → "width / height".
 */
export function renderAspectRatioChangesetPreview(resolved: mixed): string {
	const { val, width, height } = unwrapAspectRatio(resolved);

	if (val === 'custom') {
		return `${width.trim()} / ${height.trim()}`;
	}

	const selected = getSelectedSelectOption(
		val,
		getAspectRatioSelectOptions()
	);

	if (selected) {
		return selected.label;
	}

	return val !== '' ? val : '';
}
