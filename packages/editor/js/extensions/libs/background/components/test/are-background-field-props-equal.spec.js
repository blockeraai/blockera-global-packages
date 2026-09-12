import { areBackgroundFieldPropsEqual } from '../are-background-field-props-equal';

describe('areBackgroundFieldPropsEqual', () => {
	const onChange = () => {};
	const block = { blockName: 'core/paragraph', clientId: '1' };
	const layers = { item: { type: 'image' } };
	const defaultValue = {};

	it('skips when owned value identity is unchanged', () => {
		expect(
			areBackgroundFieldPropsEqual(
				{ block, value: layers, defaultValue, onChange },
				{ block, value: layers, defaultValue, onChange }
			)
		).toBe(true);
	});

	it('invalidates when the owned value identity changes', () => {
		expect(
			areBackgroundFieldPropsEqual(
				{ block, value: layers, onChange },
				{ block, value: { ...layers }, onChange }
			)
		).toBe(false);
	});

	it('invalidates when color value changes and keeps layers comparable', () => {
		expect(
			areBackgroundFieldPropsEqual(
				{ block, value: '#aaa', onChange },
				{ block, value: '#bbb', onChange }
			)
		).toBe(false);
		expect(
			areBackgroundFieldPropsEqual(
				{ block, value: layers, onChange },
				{ block, value: layers, onChange }
			)
		).toBe(true);
	});
});
