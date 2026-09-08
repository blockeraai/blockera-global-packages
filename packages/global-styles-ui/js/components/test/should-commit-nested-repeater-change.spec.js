import { shouldCommitNestedRepeaterChange } from '../should-commit-nested-repeater-change';

describe('shouldCommitNestedRepeaterChange', () => {
	const openLayer = {
		type: 'outer',
		blur: '10px',
		isOpen: true,
		isVisible: true,
		order: 0,
	};

	it('commits when there is no previous record', () => {
		expect(shouldCommitNestedRepeaterChange(null, { 'outer-0': openLayer })).toBe(
			true
		);
	});

	it('does not commit field-only edits while the item stays open', () => {
		expect(
			shouldCommitNestedRepeaterChange(
				{ 'outer-0': openLayer },
				{ 'outer-0': { ...openLayer, blur: '18px' } }
			)
		).toBe(false);
	});

	it('does not commit when the nested item closes', () => {
		expect(
			shouldCommitNestedRepeaterChange(
				{ 'outer-0': openLayer },
				{ 'outer-0': { ...openLayer, isOpen: false, blur: '18px' } }
			)
		).toBe(false);
	});

	it('does not commit when the nested item opens', () => {
		expect(
			shouldCommitNestedRepeaterChange(
				{ 'outer-0': { ...openLayer, isOpen: false } },
				{ 'outer-0': openLayer }
			)
		).toBe(false);
	});

	it('does not persist add, clone, or delete until the preset editor closes', () => {
		expect(
			shouldCommitNestedRepeaterChange(
				{ 'outer-0': openLayer },
				{
					'outer-0': openLayer,
					'outer-1': { ...openLayer, order: 1 },
				}
			)
		).toBe(false);

		expect(
			shouldCommitNestedRepeaterChange(
				{ 'outer-0': openLayer, 'outer-1': { ...openLayer, order: 1 } },
				{ 'outer-0': openLayer }
			)
		).toBe(false);
	});

	it('commits type-key changes, visibility, and reorder', () => {
		expect(
			shouldCommitNestedRepeaterChange(
				{ 'blur-0': { type: 'blur', blur: '3px', isOpen: true, order: 0 } },
				{
					'drop-shadow-0': {
						type: 'drop-shadow',
						isOpen: true,
						order: 0,
					},
				}
			)
		).toBe(true);

		expect(
			shouldCommitNestedRepeaterChange(
				{ 'outer-0': openLayer },
				{ 'outer-0': { ...openLayer, isVisible: false } }
			)
		).toBe(true);

		expect(
			shouldCommitNestedRepeaterChange(
				{
					'outer-0': openLayer,
					'inner-0': { ...openLayer, type: 'inner', order: 1 },
				},
				{
					'inner-0': { ...openLayer, type: 'inner', order: 0 },
					'outer-0': { ...openLayer, order: 1 },
				}
			)
		).toBe(true);
	});
});
