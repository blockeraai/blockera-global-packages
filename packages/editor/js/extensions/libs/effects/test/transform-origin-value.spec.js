/**
 * Internal dependencies
 */
import {
	isUnusedTransformOrigin,
	normalizeTransformOriginForControl,
	unwrapTransformOrigin,
} from '../transform-origin-value';

describe('transform origin value helpers', () => {
	it('unwraps wrapped and legacy origin objects', () => {
		expect(
			unwrapTransformOrigin({ value: { top: '0%', left: '100%' } })
		).toEqual({ top: '0%', left: '100%' });
		expect(unwrapTransformOrigin({ top: '50%', left: '25%' })).toEqual({
			top: '50%',
			left: '25%',
		});
	});

	it('normalizes missing values for controls', () => {
		expect(normalizeTransformOriginForControl(undefined)).toEqual({
			top: '',
			left: '',
		});
		expect(
			normalizeTransformOriginForControl({
				value: { top: '', left: '' },
			})
		).toEqual({ top: '', left: '' });
	});

	it('treats wrapped empty, unwrapped empty, and wrapped default as unused', () => {
		const wrappedDefault = { value: { top: '', left: '' } };

		expect(
			isUnusedTransformOrigin({ top: '', left: '' }, wrappedDefault)
		).toBe(true);
		expect(isUnusedTransformOrigin(wrappedDefault, wrappedDefault)).toBe(
			true
		);
		expect(
			isUnusedTransformOrigin(
				{ value: { top: '0%', left: '100%' } },
				wrappedDefault
			)
		).toBe(false);
	});
});
