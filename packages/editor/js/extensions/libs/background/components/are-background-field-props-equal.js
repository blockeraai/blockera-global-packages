// @flow

/**
 * Skip field re-renders when the owned value and callbacks are unchanged.
 * Used so BG Color typing does not rebuild Image & Gradient / Blending.
 *
 * @param {Object} prev
 * @param {Object} next
 * @return {boolean} True when React.memo should skip.
 */
export function areBackgroundFieldPropsEqual(
	prev: Object,
	next: Object
): boolean {
	const prevKeys = Object.keys(prev);
	const nextKeys = Object.keys(next);

	if (prevKeys.length !== nextKeys.length) {
		return false;
	}

	for (let i = 0; i < prevKeys.length; i++) {
		const key = prevKeys[i];

		if (prev[key] !== next[key]) {
			return false;
		}
	}

	return true;
}
