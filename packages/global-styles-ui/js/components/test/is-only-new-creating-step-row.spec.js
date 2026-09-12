import { isOnlyNewCreatingStepRow } from '../preset-repeater-value-utils';

describe('isOnlyNewCreatingStepRow', () => {
	it('skips persist for the first creating-step add', () => {
		expect(
			isOnlyNewCreatingStepRow(null, {
				0: { slug: 'border-1', creatingStep: true },
			})
		).toBe(true);
	});

	it('skips persist when a new creating-step row is appended', () => {
		expect(
			isOnlyNewCreatingStepRow(
				{ 0: { slug: 'border-1', creatingStep: false } },
				{
					0: { slug: 'border-1', creatingStep: false },
					1: { slug: 'border-2', creatingStep: true },
				}
			)
		).toBe(true);
	});

	it('does not skip field updates on an existing creating-step row', () => {
		expect(
			isOnlyNewCreatingStepRow(
				{
					0: {
						slug: 'border-1',
						creatingStep: true,
						border: { width: '1px' },
					},
				},
				{
					0: {
						slug: 'border-1',
						creatingStep: true,
						border: { width: '4px' },
					},
				}
			)
		).toBe(false);
	});

	it('does not skip when creating-step ends', () => {
		expect(
			isOnlyNewCreatingStepRow(
				{ 0: { slug: 'border-1', creatingStep: true } },
				{ 0: { slug: 'border-1', creatingStep: false } }
			)
		).toBe(false);
	});
});
