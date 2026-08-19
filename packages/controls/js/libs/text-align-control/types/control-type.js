// @flow
/**
 * Internal dependencies
 */
import type { ControlGeneralTypes } from '../../../types';
import type { TextAlignSelectOption } from '../utils';

export type TextAlignControlProps = {
	...ControlGeneralTypes,
	/**
	 * Override the default left / center / right / justify / none set.
	 */
	options?: Array<TextAlignSelectOption>,
	defaultValue?: string,
};
