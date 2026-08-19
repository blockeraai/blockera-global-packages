// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { TNativeOption, TSelectOptions } from '../select-control/types';

export type EditorFontFamilyItem = {
	name?: string,
	slug?: string,
	fontFamily?: string,
};

export type EditorFontFamilies =
	| Array<EditorFontFamilyItem>
	| {
			theme?: Array<EditorFontFamilyItem>,
			custom?: Array<EditorFontFamilyItem>,
			extra?: Array<EditorFontFamilyItem>,
			core?: Array<EditorFontFamilyItem>,
	  };

function mapFontFamilyItems(
	items: ?Array<EditorFontFamilyItem>
): Array<TNativeOption> {
	if (!items?.length) {
		return [];
	}

	const mapped: Array<TNativeOption> = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item?.slug) {
			continue;
		}

		mapped.push({
			label: item.name || String(item.slug),
			value: String(item.slug),
		});
	}

	return mapped;
}

function defaultOption(): TNativeOption {
	return {
		label: __('Default', 'blockera'),
		value: '',
	};
}

function pushOptgroup(
	out: TSelectOptions,
	label: string,
	items: ?Array<EditorFontFamilyItem>
): void {
	const options = mapFontFamilyItems(items);
	if (!options.length) {
		return;
	}

	out.push({
		type: 'optgroup',
		label,
		value: '',
		options,
	});
}

/**
 * Map `useSettings('typography.fontFamilies')` / experimental features
 * into native select options (Default + theme / core / custom groups).
 *
 * @param {?EditorFontFamilies} fontFamilies Editor font family presets.
 * @return {TSelectOptions} Select options.
 */
export function mapEditorFontFamiliesToSelectOptions(
	fontFamilies: ?EditorFontFamilies
): TSelectOptions {
	const out: TSelectOptions = [defaultOption()];

	if (!fontFamilies) {
		return out;
	}

	if (Array.isArray(fontFamilies)) {
		const mapped = mapFontFamilyItems(fontFamilies);
		for (let i = 0; i < mapped.length; i++) {
			out.push(mapped[i]);
		}
		return out;
	}

	pushOptgroup(out, __('Theme Fonts', 'blockera'), fontFamilies.theme);
	pushOptgroup(
		out,
		__('Core Fonts', 'blockera'),
		fontFamilies.extra || fontFamilies.core
	);
	pushOptgroup(out, __('Custom Fonts', 'blockera'), fontFamilies.custom);

	return out;
}
