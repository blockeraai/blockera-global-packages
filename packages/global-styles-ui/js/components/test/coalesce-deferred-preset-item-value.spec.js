import { coalesceDeferredPresetItemValue } from '../coalesce-deferred-preset-item-value';

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
