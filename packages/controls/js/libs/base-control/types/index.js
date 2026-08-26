// @flow

/**
 * Internal dependencies
 */
import type { ControlGeneralTypes, FieldProps } from '../../../types';
import type { LabelControlProps } from '../../label-control/types';

export type BaseControlProps = {
	...ControlGeneralTypes,
	...LabelControlProps,
	controlName?: 'empty' | 'general' | string,
	style?: Object,
	labelClassName?: string,
	controlProps?: any,
	/**
	 * Spread onto the field root only. Pass className, style, or data-cy
	 * here when they must land on the root — they are not copied from the
	 * control props (those stay on the inner control).
	 */
	fieldProps?: FieldProps,
};
