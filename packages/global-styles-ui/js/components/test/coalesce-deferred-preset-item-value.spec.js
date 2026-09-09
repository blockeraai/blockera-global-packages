import {
	coalesceDeferredPresetItemValue,
	shouldPersistEndingCreate,
} from '../coalesce-deferred-preset-item-value';

describe('coalesceDeferredPresetItemValue', () => {
	it('keeps current row fields and applies the latest patch', () => {
		expect(
			coalesceDeferredPresetItemValue(
				{ slug: 'a', size: '16px', name: 'A' },
				null,
				{ size: '22px' }
			)
		).toEqual({ slug: 'a', size: '22px', name: 'A' });
	});

	it('merges sequential patches so the last field value wins', () => {
		const pending = coalesceDeferredPresetItemValue(
			{ slug: 'a', size: '16px', name: 'A' },
			null,
			{ size: '2' }
		);

		expect(
			coalesceDeferredPresetItemValue(
				{ slug: 'a', size: '16px', name: 'A' },
				pending,
				{ size: '22px', name: 'A X' }
			)
		).toEqual({ slug: 'a', size: '22px', name: 'A X' });
	});
});

describe('shouldPersistEndingCreate', () => {
	it('persists when this hook has a staged field patch', () => {
		expect(
			shouldPersistEndingCreate({ size: '33px' }, { creatingStep: false })
		).toBe(true);
	});

	it('persists when the row is still in creatingStep', () => {
		expect(shouldPersistEndingCreate(null, { creatingStep: true })).toBe(
			true
		);
	});

	it('does not persist an empty identity hook over a sibling field persist', () => {
		expect(
			shouldPersistEndingCreate(null, {
				creatingStep: false,
				size: '20px',
			})
		).toBe(false);
	});
});
