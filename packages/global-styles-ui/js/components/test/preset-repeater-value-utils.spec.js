import {
	getPresetRepeaterItemsFromVariable,
	isPresetRepeaterObjectValue,
	normalizePresetRepeaterValueToIndexKeys,
	variablesToPresetRepeaterValue,
} from '../preset-repeater-value-utils';

describe('getPresetRepeaterItemsFromVariable', () => {
	it('reads top-level items from theme.json preset rows', () => {
		expect(
			getPresetRepeaterItemsFromVariable({
				slug: 'e-2-e-transform',
				items: [{ type: 'move', 'move-x': '15px' }],
			})
		).toEqual([{ type: 'move', 'move-x': '15px' }]);
	});

	it('reads nested value.items from variable-picker catalog rows', () => {
		expect(
			getPresetRepeaterItemsFromVariable({
				id: 'e-2-e-transform',
				value: { items: [{ type: 'move', 'move-x': '15px' }] },
			})
		).toEqual([{ type: 'move', 'move-x': '15px' }]);
	});

	it('uses value.items when top-level items is an empty array', () => {
		expect(
			getPresetRepeaterItemsFromVariable({
				items: [],
				value: { items: [{ type: 'move', 'move-x': '8px' }] },
			})
		).toEqual([{ type: 'move', 'move-x': '8px' }]);
	});

	it('returns empty when neither shape is present', () => {
		expect(getPresetRepeaterItemsFromVariable({ slug: 'x' })).toEqual([]);
		expect(getPresetRepeaterItemsFromVariable(null)).toEqual([]);
	});
});

describe('isPresetRepeaterObjectValue', () => {
	it('returns true for plain object maps', () => {
		expect(
			isPresetRepeaterObjectValue({ 'spacing-1': { slug: 'spacing-1' } })
		).toBe(true);
	});

	it('returns false for arrays and nullish values', () => {
		expect(isPresetRepeaterObjectValue([])).toBe(false);
		expect(isPresetRepeaterObjectValue(null)).toBe(false);
		expect(isPresetRepeaterObjectValue(undefined)).toBe(false);
	});
});

describe('variablesToPresetRepeaterValue', () => {
	it('returns empty object for nullish values', () => {
		expect(variablesToPresetRepeaterValue(null)).toEqual({});
		expect(variablesToPresetRepeaterValue(undefined)).toEqual({});
	});

	it('passes through existing repeater object maps unchanged', () => {
		const input = {
			'font-size-fallback-my-size': {
				slug: 'my-size',
				name: 'My Size',
				order: 2,
			},
		};

		expect(variablesToPresetRepeaterValue(input)).toBe(input);
	});

	it('converts preset arrays to index-keyed repeater maps with order', () => {
		expect(
			variablesToPresetRepeaterValue([
				{ slug: 'spacing-20', name: 'Spacing 20', size: '20px' },
				{ slug: 'spacing-40', name: 'Spacing 40', size: '40px' },
			])
		).toEqual({
			0: {
				slug: 'spacing-20',
				name: 'Spacing 20',
				size: '20px',
				order: 1,
			},
			1: {
				slug: 'spacing-40',
				name: 'Spacing 40',
				size: '40px',
				order: 2,
			},
		});
	});

	it('uses index keys when slug and id are missing', () => {
		expect(
			variablesToPresetRepeaterValue([
				{ name: 'Draft 1' },
				{ name: 'Draft 2' },
			])
		).toEqual({
			0: { name: 'Draft 1', order: 1 },
			1: { name: 'Draft 2', order: 2 },
		});
	});
});

describe('normalizePresetRepeaterValueToIndexKeys', () => {
	it('dedupes slug and index keys for the same preset row', () => {
		expect(
			normalizePresetRepeaterValueToIndexKeys({
				0: { slug: 'font-size-1', name: 'One', order: 1 },
				1: { slug: 'font-size-2', name: 'Two', order: 2 },
				'font-size-3': {
					slug: 'font-size-3',
					name: 'Three',
					order: 3,
				},
				2: {
					slug: 'font-size-3',
					name: 'Three',
					order: 3,
					size: '18px',
				},
			})
		).toEqual({
			0: { slug: 'font-size-1', name: 'One', order: 1 },
			1: { slug: 'font-size-2', name: 'Two', order: 2 },
			2: {
				slug: 'font-size-3',
				name: 'Three',
				order: 3,
				size: '18px',
			},
		});
	});
});
