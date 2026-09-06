import { retainIfEqual } from '../retain-if-equal';

const isEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

describe('retainIfEqual', () => {
	it('returns the same reference when contents match', () => {
		const previous = { name: 'font-size', value: { value: '16px' } };
		const next = { name: 'font-size', value: { value: '16px' } };

		expect(retainIfEqual(previous, next, isEquals)).toBe(previous);
	});

	it('returns next when contents differ', () => {
		const previous = { name: 'font-size', value: { value: '16px' } };
		const next = { name: 'font-size', value: { value: '18px' } };

		expect(retainIfEqual(previous, next, isEquals)).toBe(next);
	});

	it('does not walk value when name and value identities match', () => {
		const value = { value: '16px' };
		const previous = { name: 'font-size', value, attribute: 'a' };
		const next = { name: 'font-size', value, attribute: 'a' };
		const deepEqual = jest.fn(isEquals);

		expect(retainIfEqual(previous, next, deepEqual)).toBe(previous);
		expect(deepEqual).toHaveBeenCalledTimes(1);
		expect(deepEqual.mock.calls[0][0]).toEqual({
			name: 'font-size',
			attribute: 'a',
		});
	});
});
