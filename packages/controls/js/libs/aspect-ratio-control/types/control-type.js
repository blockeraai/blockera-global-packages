// @flow
/**
 * Internal dependencies
 */
import type { ControlGeneralTypes } from '../../../types';

export type AspectRatioValue = {
	val: string,
	width: string,
	height: string,
	value?: string,
};

export type AspectRatioControlProps = {
	...ControlGeneralTypes,
	/**
	 * Current ratio object. Used for backward-compat nested ids (`value` vs `val`).
	 * Live value still comes from ControlContext.
	 */
	ratio?: AspectRatioValue,
	/**
	 * Default when the control is empty / reset.
	 */
	defaultValue?: AspectRatioValue,
};
