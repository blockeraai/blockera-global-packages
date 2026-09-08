import { arePresetRepeaterItemEditorEqual } from '../are-preset-repeater-item-editor-equal';

describe('arePresetRepeaterItemEditorEqual', () => {
	it('treats cloned chrome flags as unchanged', () => {
		const previous = {
			slug: 'blur',
			name: 'Blur',
			items: [{ type: 'blur', blur: '3px' }],
			renderRepeaterItem: true,
		};
		const next = {
			slug: 'blur',
			name: 'Blur',
			items: [{ type: 'blur', blur: '3px' }],
			renderRepeaterItem: false,
			hasVariations: true,
			isSelected: true,
		};

		expect(arePresetRepeaterItemEditorEqual(previous, next)).toBe(true);
	});

	it('detects a nested type change', () => {
		const previous = {
			slug: 'fx',
			items: [{ type: 'blur', blur: '3px' }],
		};
		const next = {
			slug: 'fx',
			items: [{ type: 'drop-shadow', 'drop-shadow-x': '12px' }],
		};

		expect(arePresetRepeaterItemEditorEqual(previous, next)).toBe(false);
	});

	it('detects a visible scalar field change', () => {
		expect(
			arePresetRepeaterItemEditorEqual(
				{ slug: 'a', size: '16px' },
				{ slug: 'a', size: '18px' }
			)
		).toBe(false);
	});
});
