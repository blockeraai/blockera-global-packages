/**
 * mapImageSizesToResolutionOptions: Gutenberg imageSizes → select options.
 */

import { DEFAULT_RESOLUTION_OPTIONS } from '../constants';
import { mapImageSizesToResolutionOptions } from '../utils';

describe('mapImageSizesToResolutionOptions', () => {
	it('falls back when sizes are missing or empty', () => {
		expect(mapImageSizesToResolutionOptions()).toBe(
			DEFAULT_RESOLUTION_OPTIONS
		);
		expect(mapImageSizesToResolutionOptions([])).toBe(
			DEFAULT_RESOLUTION_OPTIONS
		);
	});

	it('maps slug/name to value/label', () => {
		expect(
			mapImageSizesToResolutionOptions([
				{ slug: '1536x1536', name: '1536×1536' },
				{ slug: 'full', name: 'Full Size' },
			])
		).toEqual([
			{ value: '1536x1536', label: '1536×1536' },
			{ value: 'full', label: 'Full Size' },
		]);
	});

	it('drops sizes without a slug and uses the slug as label when name is missing', () => {
		expect(
			mapImageSizesToResolutionOptions([
				{ name: 'No slug' },
				{ slug: 'medium' },
			])
		).toEqual([{ value: 'medium', label: 'medium' }]);
	});

	it('falls back when every size lacks a slug', () => {
		expect(mapImageSizesToResolutionOptions([{ name: 'x' }])).toBe(
			DEFAULT_RESOLUTION_OPTIONS
		);
	});
});
