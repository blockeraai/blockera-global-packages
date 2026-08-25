import { joinTransitionCssFromRepeaterMap } from '../transition-repeater-to-css';

describe('joinTransitionCssFromRepeaterMap', () => {
	it('joins default all/ease/500ms rows', () => {
		expect(
			joinTransitionCssFromRepeaterMap({
				'all-0': {
					type: 'all',
					duration: '500ms',
					timing: 'ease',
					delay: '0ms',
					isVisible: true,
					order: 0,
				},
			})
		).toBe('all 500ms ease 0ms');
	});

	it('still emits CSS when isVisible is omitted (catalog rows)', () => {
		expect(
			joinTransitionCssFromRepeaterMap({
				'all-0': {
					type: 'all',
					duration: '500ms',
					timing: 'ease',
					delay: '0ms',
				},
			})
		).toBe('all 500ms ease 0ms');
	});

	it('unwraps a schema { value } wrapper around the repeater map', () => {
		expect(
			joinTransitionCssFromRepeaterMap({
				value: {
					'all-0': {
						type: 'all',
						duration: '500ms',
						timing: 'ease',
						delay: '0ms',
						isVisible: true,
						order: 0,
					},
				},
			})
		).toBe('all 500ms ease 0ms');
	});
});
