import { coerceThemeJsonPresetOriginList } from '../coerce-theme-json-preset-origin-list';

describe('coerceThemeJsonPresetOriginList', () => {
	const themeRow = { slug: 'from-theme', name: 'Theme' };
	const listRow = { slug: 'from-list', name: 'List' };

	it('keeps a non-empty origin slice', () => {
		expect(
			coerceThemeJsonPresetOriginList([themeRow], {
				theme: [themeRow],
				default: [],
			})
		).toEqual([themeRow]);
	});

	it('uses a presets list when origin.theme is missing', () => {
		expect(
			coerceThemeJsonPresetOriginList(undefined, [listRow])
		).toEqual([listRow]);
	});

	it('merges numeric keys from presets[] onto the origin slice', () => {
		expect(
			coerceThemeJsonPresetOriginList([themeRow], {
				theme: [themeRow],
				0: listRow,
			})
		).toEqual([themeRow, listRow]);
	});

	it('uses numeric keys when origin.theme is empty', () => {
		expect(
			coerceThemeJsonPresetOriginList([], {
				theme: [],
				0: listRow,
			})
		).toEqual([listRow]);
	});
});
