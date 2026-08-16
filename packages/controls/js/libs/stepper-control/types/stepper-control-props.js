// @flow

/**
 * External dependencies
 */
import type { Node } from 'react';

/**
 * Internal dependencies
 */
import type { ControlGeneralTypes, ControlSize } from '../../../types';

export type TStepperControlProps = {
	...ControlGeneralTypes,
	/**
	 * Fallback when the stored value is empty or undefined.
	 */
	defaultValue?: number | string,
	/**
	 * The minimum value allowed.
	 */
	min?: number,
	/**
	 * The maximum value allowed.
	 */
	max?: number,
	/**
	 * Increment size for buttons, keyboard, and Shift-modified steps.
	 *
	 * @default 1
	 */
	step?: number,
	/**
	 * Multiplier applied to `step` when Shift is held.
	 *
	 * @default 10
	 */
	shiftStep?: number,
	/**
	 * Allow decimal values. When false, values are parsed as integers.
	 *
	 * @default false
	 */
	float?: boolean,
	/**
	 * Disable the input and step buttons.
	 *
	 * @default false
	 */
	disabled?: boolean,
	/**
	 * Visual size, matching InputControl.
	 *
	 * @default "normal"
	 */
	size?: ControlSize,
	/**
	 * Show the flanking minus / plus buttons.
	 *
	 * @default true
	 */
	showButtons?: boolean,
	/**
	 * Allow an empty string as a committed value.
	 *
	 * @default false
	 */
	allowEmpty?: boolean,
	/**
	 * When both min and max are set, stepping past a bound wraps to the other.
	 *
	 * @default false
	 */
	wrap?: boolean,
	/**
	 * CSS width of the number field.
	 */
	inputWidth?: string | number,
	/**
	 * Optional content before the number field (not a unit picker).
	 */
	prefix?: Node,
	/**
	 * Optional content after the number field (not a unit picker).
	 */
	suffix?: Node,
	/**
	 * Input placeholder.
	 */
	placeholder?: string,
	/**
	 * Return false to mark the value invalid and skip commit.
	 */
	validator?: (value: number | string) => boolean,
	/**
	 * When true, write through `useControlContext`. When false, only call `onChange`.
	 *
	 * @default true
	 */
	sideEffect?: boolean,
};
