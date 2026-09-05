// @flow

/**
 * Blockera dependencies
 */
import { isEquals } from '@blockera/utils';

/**
 * Skip extension re-renders when sliced values and UI keys are unchanged.
 * Functions compare by reference (parent should pass stable callbacks).
 *
 * @param {Object} prev
 * @param {Object} next
 * @return {boolean} True when props are equal (React.memo skip).
 */
export function areExtensionPropsEqual(prev: Object, next: Object): boolean {
	const prevKeys = Object.keys(prev);
	const nextKeys = Object.keys(next);

	if (prevKeys.length !== nextKeys.length) {
		return false;
	}

	for (let i = 0; i < prevKeys.length; i++) {
		const key = prevKeys[i];

		if (!Object.prototype.hasOwnProperty.call(next, key)) {
			return false;
		}

		const a = prev[key];
		const b = next[key];

		if (a === b) {
			continue;
		}

		if (typeof a === 'function' || typeof b === 'function') {
			return false;
		}

		if (!isEquals(a, b)) {
			return false;
		}
	}

	return true;
}
