/**
 * mapEditorFontFamiliesToSelectOptions: theme.json fonts → select options.
 */

import { mapEditorFontFamiliesToSelectOptions } from '../utils';

describe('mapEditorFontFamiliesToSelectOptions', () => {
	it('always starts with Default when fonts are missing', () => {
		expect(mapEditorFontFamiliesToSelectOptions()).toEqual([
			{ label: 'Default', value: '' },
		]);
		expect(mapEditorFontFamiliesToSelectOptions(null)).toEqual([
			{ label: 'Default', value: '' },
		]);
	});

	it('flattens a font array after Default', () => {
		expect(
			mapEditorFontFamiliesToSelectOptions([
				{ slug: 'inter', name: 'Inter' },
				{ slug: 'mono' },
			])
		).toEqual([
			{ label: 'Default', value: '' },
			{ label: 'Inter', value: 'inter' },
			{ label: 'mono', value: 'mono' },
		]);
	});

	it('groups theme, core/extra, and custom fonts', () => {
		expect(
			mapEditorFontFamiliesToSelectOptions({
				theme: [{ slug: 'cardo', name: 'Cardo' }],
				extra: [{ slug: 'system', name: 'System' }],
				custom: [{ slug: 'brand', name: 'Brand' }],
			})
		).toEqual([
			{ label: 'Default', value: '' },
			{
				type: 'optgroup',
				label: 'Theme Fonts',
				value: '',
				options: [{ label: 'Cardo', value: 'cardo' }],
			},
			{
				type: 'optgroup',
				label: 'Core Fonts',
				value: '',
				options: [{ label: 'System', value: 'system' }],
			},
			{
				type: 'optgroup',
				label: 'Custom Fonts',
				value: '',
				options: [{ label: 'Brand', value: 'brand' }],
			},
		]);
	});

	it('drops families without a slug', () => {
		expect(
			mapEditorFontFamiliesToSelectOptions([
				{ name: 'No slug' },
				{ slug: 'ok', name: 'OK' },
			])
		).toEqual([
			{ label: 'Default', value: '' },
			{ label: 'OK', value: 'ok' },
		]);
	});
});
