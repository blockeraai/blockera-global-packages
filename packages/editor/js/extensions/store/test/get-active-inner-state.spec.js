import { getActiveInnerState } from '../selectors';

describe('getActiveInnerState', () => {
	it('prefers the per-client inner-block active state', () => {
		expect(
			getActiveInnerState(
				{
					blockExtensions: {
						currentInnerBlockState: 'hover',
						'core-group': {
							'elements/link-active-state': 'normal',
						},
					},
				},
				'core-group',
				'elements/link'
			)
		).toBe('normal');
	});

	it('falls back to currentInnerBlockState when the client has no inner active state', () => {
		expect(
			getActiveInnerState(
				{
					blockExtensions: {
						currentInnerBlockState: 'hover',
						'core-group': {
							'core/group-active-state': 'normal',
						},
					},
				},
				'core-group',
				'elements/link'
			)
		).toBe('hover');
	});

	it('defaults to normal when nothing is set', () => {
		expect(
			getActiveInnerState({ blockExtensions: {} }, 'core-group', 'elements/link')
		).toBe('normal');
	});
});
