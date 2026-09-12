import { getSelectedSelectOption } from '../../select-control/utils';
import {
	appendNotFoundUnitOption,
	getCSSUnits,
	getUnitByValue,
} from '../utils';

describe('InputControl unit catalogs', () => {
	test('getCSSUnits returns the same catalog instance for a unit type', () => {
		const first = getCSSUnits('outline');
		const second = getCSSUnits('outline');

		expect(first).toBe(second);
		expect(first.length).toBeGreaterThan(0);
	});

	test('getCSSUnits returns a shared empty list for invalid types', () => {
		expect(getCSSUnits()).toBe(getCSSUnits(undefined));
		expect(getCSSUnits()).toEqual([]);
	});

	test('getUnitByValue matches grouped select lookup and keeps option identity', () => {
		const units = getCSSUnits('outline');
		const fromIndex = getUnitByValue('px', units);
		const fromWalk = getSelectedSelectOption('px', units);

		expect(fromIndex).toBe(fromWalk);
		expect(getUnitByValue('px', units)).toBe(fromIndex);
	});

	test('appendNotFoundUnitOption copies the package instead of mutating catalogs', () => {
		const catalog = getCSSUnits('outline');
		const units = [
			...catalog,
			{
				id: 'founded_from_inputs',
				label: 'Founded From Inputs',
				options: [],
			},
		];
		const custom = {
			value: 'xyz',
			label: 'XYZ',
			format: 'number',
			notFound: true,
		};

		const next = appendNotFoundUnitOption(units, custom);

		expect(next).not.toBe(units);
		expect(next[next.length - 1].options).toEqual([custom]);
		expect(units[units.length - 1].options).toEqual([]);
		expect(catalog).toBe(getCSSUnits('outline'));
	});
});
