// @flow
/**
 * Internal dependencies
 */
import type {
	ControlGeneralTypes,
	ControlValueAddonTypes,
} from '../../../types';
import type { TSelectOptions } from '../../select-control/types';

export type FontFamilyControlProps = {
	...ControlGeneralTypes,
	...ControlValueAddonTypes,
	/**
	 * Font family options. When omitted, options come from
	 * `useSettings('typography.fontFamilies')`.
	 */
	options?: TSelectOptions,
	defaultValue?: string,
};
