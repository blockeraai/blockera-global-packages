import { resolveControlSelectResult } from '../resolve-control-select-result';

const isEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

describe('resolveControlSelectResult', () => {
	it('uses incoming value while the control is not in the store', () => {
		expect(
			resolveControlSelectResult(undefined, { value: '16px' }, isEquals)
		).toEqual({
			status: true,
			value: '16px',
		});
	});

	it('returns the store record when skipSyncValue is set', () => {
		const control = { status: true, value: 'from-store' };

		expect(
			resolveControlSelectResult(
				control,
				{ skipSyncValue: true, value: 'from-props' },
				isEquals
			)
		).toBe(control);
	});

	it('overlays the provider value when it differs from the store', () => {
		expect(
			resolveControlSelectResult(
				{ status: true, value: '12px' },
				{ value: '16px' },
				isEquals
			)
		).toEqual({
			status: true,
			value: '16px',
		});
	});

	it('returns the store record when values match', () => {
		const control = { status: true, value: '16px' };

		expect(
			resolveControlSelectResult(control, { value: '16px' }, isEquals)
		).toBe(control);
	});
});
