import { resolveColorPaletteThemeRows } from '../utils';

describe('resolveColorPaletteThemeRows', () => {
	const themeRow = { slug: 'theme-a', name: 'Theme A', color: '#111' };
	const muRow = {
		slug: 'e-2-e-tax-mix-leaf',
		name: 'E2E Tax Mixed Group/E2E Tax Mixed Category/E2E Tax Mixed Leaf',
		color: '#654321',
	};

	it('returns a flat palette array as theme rows', () => {
		expect(
			resolveColorPaletteThemeRows({
				palette: [themeRow, muRow],
			})
		).toEqual([themeRow, muRow]);
	});

	it('returns palette.theme when that origin is a list', () => {
		expect(
			resolveColorPaletteThemeRows({
				palette: { theme: [themeRow], default: [] },
			})
		).toEqual([themeRow]);
	});

	it('merges MU palette[] numeric keys onto palette.theme', () => {
		expect(
			resolveColorPaletteThemeRows({
				palette: {
					theme: [themeRow],
					0: muRow,
				},
			})
		).toEqual([themeRow, muRow]);
	});

	it('uses numeric palette[] keys when palette.theme is empty', () => {
		expect(
			resolveColorPaletteThemeRows({
				palette: {
					theme: [],
					0: muRow,
				},
			})
		).toEqual([muRow]);
	});
});
