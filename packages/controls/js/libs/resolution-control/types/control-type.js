// @flow
/**
 * Internal dependencies
 */
import type { ControlGeneralTypes } from '../../../types';
import type { TNativeOption, TSelectOptions } from '../../select-control/types';

export type ResolutionOption = TNativeOption;

export type ResolutionControlProps = {
	...ControlGeneralTypes,
	/**
	 * Image size options (`slug` / label). When omitted, options come from
	 * `blockEditorStore.getSettings().imageSizes`, falling back to
	 * thumbnail / medium / large / full.
	 */
	options?: TSelectOptions,
	/**
	 * Fallback when value is empty. Gutenberg editor default is `full`.
	 */
	defaultValue?: string,
};
