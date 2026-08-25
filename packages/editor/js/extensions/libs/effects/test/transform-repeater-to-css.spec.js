import { joinTransformCssFromRepeaterMap } from '../transform-repeater-to-css';

describe('joinTransformCssFromRepeaterMap', () => {
	const moveRow = {
		type: 'move',
		'move-x': '0px',
		'move-y': '0px',
		'move-z': '0px',
		isVisible: true,
		order: 0,
	};

	it('joins default move rows', () => {
		expect(
			joinTransformCssFromRepeaterMap({
				'move-0': moveRow,
			})
		).toBe('translate3d(0px, 0px, 0px)');
	});

	it('unwraps a schema { value } wrapper around the repeater map', () => {
		expect(
			joinTransformCssFromRepeaterMap({
				value: { 'move-0': moveRow },
			})
		).toBe('translate3d(0px, 0px, 0px)');
	});
});
