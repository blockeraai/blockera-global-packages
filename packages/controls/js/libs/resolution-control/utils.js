// @flow
/**
 * Internal dependencies
 */
import { DEFAULT_RESOLUTION_OPTIONS } from './constants';
import type { TSelectOptions } from '../select-control/types';

export type ImageSizeSetting = {
	slug?: string,
	name?: string,
};

/**
 * Map block-editor `imageSizes` into native select options.
 * Falls back to thumbnail / medium / large / full when the list is empty.
 *
 * @param {?Array<ImageSizeSetting>} imageSizes Editor `getSettings().imageSizes`.
 * @return {TSelectOptions} Select options.
 */
export function mapImageSizesToResolutionOptions(
	imageSizes: ?Array<ImageSizeSetting>
): TSelectOptions {
	if (!imageSizes?.length) {
		return DEFAULT_RESOLUTION_OPTIONS;
	}

	const mapped: TSelectOptions = imageSizes
		.filter((size) => !!size.slug)
		.map((size) => ({
			value: String(size.slug),
			label: size.name || String(size.slug),
		}));

	return mapped.length ? mapped : DEFAULT_RESOLUTION_OPTIONS;
}
