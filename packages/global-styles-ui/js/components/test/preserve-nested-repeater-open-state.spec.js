import { preserveNestedRepeaterOpenState } from '../preserve-nested-repeater-open-state';

describe('preserveNestedRepeaterOpenState', () => {
	it('keeps isOpen on the same key after a persist echo without isOpen', () => {
		expect(
			preserveNestedRepeaterOpenState(
				{
					'drop-shadow-0': {
						type: 'drop-shadow',
						'drop-shadow-blur': '10px',
						order: 0,
					},
				},
				{
					'drop-shadow-0': {
						type: 'drop-shadow',
						'drop-shadow-blur': '10px',
						isOpen: true,
						order: 0,
					},
				}
			)
		).toEqual({
			'drop-shadow-0': {
				type: 'drop-shadow',
				'drop-shadow-blur': '10px',
				order: 0,
				isOpen: true,
			},
		});
	});

	it('keeps isOpen across a type-key rename', () => {
		expect(
			preserveNestedRepeaterOpenState(
				{
					'drop-shadow-0': {
						type: 'drop-shadow',
						order: 0,
					},
				},
				{
					'blur-0': {
						type: 'blur',
						blur: '7px',
						isOpen: true,
						order: 0,
					},
				}
			)
		).toEqual({
			'drop-shadow-0': {
				type: 'drop-shadow',
				order: 0,
				isOpen: true,
			},
		});
	});

	it('keeps the editor open across a type-key rename when live has no isOpen', () => {
		expect(
			preserveNestedRepeaterOpenState(
				{
					'drop-shadow-0': {
						type: 'drop-shadow',
						order: 0,
					},
				},
				{
					'blur-0': {
						type: 'blur',
						blur: '7px',
						order: 0,
					},
				}
			)
		).toEqual({
			'drop-shadow-0': {
				type: 'drop-shadow',
				order: 0,
				isOpen: true,
			},
		});
	});

	it('does not reopen a layer that was closed', () => {
		expect(
			preserveNestedRepeaterOpenState(
				{
					'blur-0': { type: 'blur', blur: '7px', order: 0 },
				},
				{
					'blur-0': {
						type: 'blur',
						blur: '7px',
						isOpen: false,
						order: 0,
					},
				}
			)
		).toEqual({
			'blur-0': { type: 'blur', blur: '7px', order: 0 },
		});
	});
});
