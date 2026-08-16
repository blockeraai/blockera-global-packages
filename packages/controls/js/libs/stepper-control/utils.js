// @flow

export type ClampOrWrapOptions = {
	min?: number,
	max?: number,
	wrap?: boolean,
};

export type StepValueOptions = {
	min?: number,
	max?: number,
	step?: number,
	shiftStep?: number,
	shift?: boolean,
	wrap?: boolean,
	float?: boolean,
};

export function isFiniteNumber(value: mixed): boolean {
	return typeof value === 'number' && Number.isFinite(value);
}

function decimalPlaces(value: number): number {
	const text = String(value);
	const index = text.indexOf('.');

	return -1 === index ? 0 : text.length - index - 1;
}

/**
 * Parse a raw stepper value.
 *
 * @return {number|''|null} number, empty string, or null when invalid
 */
export function parseStepperValue(
	raw: mixed,
	float: boolean
): number | '' | null {
	if ('' === raw || null === raw || typeof raw === 'undefined') {
		return '';
	}

	const text = typeof raw === 'number' ? String(raw) : String(raw).trim();

	if ('' === text || '-' === text || '.' === text || '-.' === text) {
		return '';
	}

	const parsed = float ? parseFloat(text) : parseInt(text, 10);

	if (Number.isNaN(parsed)) {
		return null;
	}

	return parsed;
}

export function clampOrWrap(
	value: number,
	{ min, max, wrap = false }: ClampOrWrapOptions
): number {
	const hasMin = isFiniteNumber(min);
	const hasMax = isFiniteNumber(max);

	// Wrap only when both ends exist; otherwise fall through to clamp.
	if (wrap && hasMin && hasMax) {
		if (value > max) {
			return min;
		}

		if (value < min) {
			return max;
		}

		return value;
	}

	if (hasMin && value < min) {
		return min;
	}

	if (hasMax && value > max) {
		return max;
	}

	return value;
}

export function stepValue(
	value: mixed,
	direction: 1 | -1,
	options: StepValueOptions
): number {
	const {
		min,
		max,
		step = 1,
		shiftStep = 10,
		shift = false,
		wrap = false,
		float = false,
	} = options;

	const current = isFiniteNumber(value) ? value : 0;
	const delta = step * (shift ? shiftStep : 1) * direction;
	let next = current + delta;

	// Round to the step's decimal places so 0.1 + 0.2 does not miss min/max.
	if (float) {
		const places = Math.max(decimalPlaces(step), decimalPlaces(current));
		const factor = Math.pow(10, places);
		next = Math.round(next * factor) / factor;
	} else {
		next = Math.round(next);
	}

	return clampOrWrap(next, { min, max, wrap });
}

export function isAtBound(value: mixed, bound: ?number): boolean {
	return isFiniteNumber(bound) && isFiniteNumber(value) && value === bound;
}
