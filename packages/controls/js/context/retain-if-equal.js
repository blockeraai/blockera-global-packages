// @flow

/**
 * Keep the previous object when contents are equal so React context identities stay stable.
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

	if (
		previous !== null &&
		previous !== undefined &&
		next !== null &&
		next !== undefined &&
		isEquals(previous, next)
	) {
		return previous;
	}

	return next;
}
