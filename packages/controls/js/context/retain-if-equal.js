// @flow

/**
 * Keep the previous object when contents are equal so React context identities stay stable.
 *
 * When `value` is the same reference (inspector typing of a sibling field),
 * skip walking that tree and only deep-compare the other keys.
 *
 * @param {any} previous Last retained value.
 * @param {any} next Incoming value.
 * @param {Function} isEquals Deep equality.
 * @return {any} previous if equal, otherwise next.
 */
export function retainIfEqual<T>(
	previous: T,
	next: T,
	isEquals: (a: T, b: T) => boolean
): T {
	if (previous === next) {
		return previous;
	}

	if (previous === null || previous === undefined || next === null || next === undefined) {
		return next;
	}

	if (
		typeof previous === 'object' &&
		typeof next === 'object' &&
		!Array.isArray(previous) &&
		!Array.isArray(next)
	) {
		const prevObj: Object = previous;
		const nextObj: Object = next;

		if (prevObj.value === nextObj.value && prevObj.name === nextObj.name) {
			const { value: _prevValue, ...prevRest } = prevObj;
			const { value: _nextValue, ...nextRest } = nextObj;

			if (isEquals(prevRest, nextRest)) {
				return previous;
			}

			return next;
		}
	}

	if (isEquals(previous, next)) {
		return previous;
	}

	return next;
}
