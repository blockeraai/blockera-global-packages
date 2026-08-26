/**
 * Internal dependencies
 */
import {
	clampOrWrap,
	isAtBound,
	parseStepperValue,
	stepValue,
} from '../utils';

describe('StepperControl utils', () => {
	describe('parseStepperValue', () => {
		test('parses integers', () => {
			expect(parseStepperValue('12', false)).toBe(12);
			expect(parseStepperValue('12.9', false)).toBe(12);
		});

		test('parses floats', () => {
			expect(parseStepperValue('1.5', true)).toBe(1.5);
		});

		test('returns empty for blank values', () => {
			expect(parseStepperValue('', false)).toBe('');
			expect(parseStepperValue(null, false)).toBe('');
			expect(parseStepperValue(undefined, false)).toBe('');
			expect(parseStepperValue('-', false)).toBe('');
			expect(parseStepperValue('.', true)).toBe('');
			expect(parseStepperValue('-.', true)).toBe('');
		});

		test('returns null for invalid text', () => {
			expect(parseStepperValue('abc', false)).toBe(null);
		});
	});

	describe('clampOrWrap', () => {
		test('clamps to min and max', () => {
			expect(clampOrWrap(-2, { min: 0, max: 5 })).toBe(0);
			expect(clampOrWrap(9, { min: 0, max: 5 })).toBe(5);
		});

		test('wraps when both bounds exist', () => {
			expect(clampOrWrap(6, { min: 1, max: 5, wrap: true })).toBe(1);
			expect(clampOrWrap(0, { min: 1, max: 5, wrap: true })).toBe(5);
		});

		test('clamps when wrap is set but a bound is missing', () => {
			expect(clampOrWrap(0, { min: 1, wrap: true })).toBe(1);
			expect(clampOrWrap(9, { max: 5, wrap: true })).toBe(5);
		});
	});

	describe('stepValue', () => {
		test('steps by the given amount', () => {
			expect(stepValue(2, 1, { step: 3 })).toBe(5);
			expect(stepValue(2, -1, { step: 3 })).toBe(-1);
			expect(stepValue('', 1, { step: 1 })).toBe(1);
		});

		test('applies shiftStep', () => {
			expect(stepValue(0, 1, { step: 1, shiftStep: 10, shift: true })).toBe(
				10
			);
		});

		test('wraps at the bounds', () => {
			expect(
				stepValue(3, 1, { min: 1, max: 3, step: 1, wrap: true })
			).toBe(1);
		});
	});

	describe('isAtBound', () => {
		test('detects the bound', () => {
			expect(isAtBound(3, 3)).toBe(true);
			expect(isAtBound(2, 3)).toBe(false);
			expect(isAtBound(3, undefined)).toBe(false);
		});
	});
});
