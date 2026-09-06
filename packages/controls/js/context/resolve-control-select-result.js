// @flow

/**
 * Blockera dependencies
 */
import { isUndefined } from '@blockera/utils';

/**
 * Map a controls-store record (or a missing record) to what ControlContextProvider
 * reads. When the control is not registered yet, use the incoming value with
 * status true instead of dispatching addControl during render.
 *
 * @param {Object|null|void} control Store record from getControl.
 * @param {Object} controlInfo Provider `value` prop.
 * @param {Function} isEquals Deep equality.
 * @return {Object} `{ status, value, ... }`.
 */
export function resolveControlSelectResult(
	control: ?Object,
	controlInfo: Object,
	isEquals: (a: mixed, b: mixed) => boolean
): Object {
	if (!control) {
		return {
			status: true,
			value: controlInfo.value,
		};
	}

	if (
		controlInfo.hasOwnProperty('skipSyncValue') &&
		true === controlInfo.skipSyncValue
	) {
		return control;
	}

	if (
		!isUndefined(controlInfo.value) &&
		!isEquals(control.value, controlInfo.value)
	) {
		return {
			...control,
			value: controlInfo.value,
		};
	}

	return control;
}
