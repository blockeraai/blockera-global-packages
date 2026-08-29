/**
 * Internal dependencies
 */
import { getBlockeraBlockStatesValue } from '../utils';

describe('getBlockeraBlockStatesValue', () => {
	it('returns an empty object for missing values', () => {
		expect(getBlockeraBlockStatesValue(undefined)).toEqual({});
		expect(getBlockeraBlockStatesValue(null)).toEqual({});
		expect(getBlockeraBlockStatesValue('hover')).toEqual({});
	});

	it('passes through an already-unwrapped states map', () => {
		const states = {
			hover: {
				isVisible: true,
				breakpoints: {
					desktop: { attributes: { blockeraFontSize: '20px' } },
				},
			},
		};

		expect(getBlockeraBlockStatesValue(states)).toBe(states);
	});

	it('unwraps the store `{ value: states }` shape', () => {
		const hover = {
			isVisible: true,
			breakpoints: {
				desktop: { attributes: { blockeraFontSize: '20px' } },
			},
		};

		expect(
			getBlockeraBlockStatesValue({
				value: { hover },
			})
		).toEqual({ hover });
	});

	it('unwraps a double `{ value: { value: states } }` wrap', () => {
		const hover = {
			isVisible: true,
			breakpoints: {
				desktop: { attributes: { blockeraFontSize: '20px' } },
			},
		};

		expect(
			getBlockeraBlockStatesValue({
				value: { value: { hover } },
			})
		).toEqual({ hover });
	});
});
