import {
	createPresetItemHeaderDraftStore,
	mergePresetItemWithHeaderDraft,
} from '../preset-item-header-draft-store';

describe('preset item header draft store', () => {
	it('notifies only the patched item', () => {
		const store = createPresetItemHeaderDraftStore();
		const first = jest.fn();
		const second = jest.fn();

		store.subscribe('0', first);
		store.subscribe('1', second);
		store.patch('0', { size: '22px' });

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
		expect(store.get('0')).toEqual({ size: '22px' });
	});

	it('merges successive patches for one item', () => {
		const store = createPresetItemHeaderDraftStore();

		store.patch('0', { size: '16px' });
		store.patch('0', { name: 'Large' });

		expect(store.get('0')).toEqual({ size: '16px', name: 'Large' });
	});

	it('overlays draft fields onto the repeater item', () => {
		expect(
			mergePresetItemWithHeaderDraft(
				{ name: 'Old', size: '12px', slug: 's' },
				{ size: '22px' }
			)
		).toEqual({ name: 'Old', size: '22px', slug: 's' });
	});
});
