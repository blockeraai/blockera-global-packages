// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import type { MixedElement } from 'react';

/**
 * Internal dependencies
 */
import ToggleSelectControl from '../toggle-select-control';
import type { TextAlignControlProps } from './types';
import { DEFAULT_TEXT_ALIGN_VALUE } from './constants';
import { getTextAlignSelectOptions } from './utils';

export type * from './types';
export * from './utils';
export { DEFAULT_TEXT_ALIGN_VALUE, TEXT_ALIGN_VALUES } from './constants';

const EMPTY_FIELD_PROPS = {};
const DEFAULT_FIELD_PROPS = { 'data-test': 'text-align-control' };

const DEFAULT_LABEL_DESCRIPTION = (
	<p>
		{__(
			'It sets the horizontal alignment of text within the block, offering alignment options like left, right, center, and justify.',
			'blockera'
		)}
	</p>
);

export default function TextAlignControl({
	id,
	label = __('Text Align', 'blockera'),
	labelDescription = DEFAULT_LABEL_DESCRIPTION,
	options: optionsProp,
	defaultValue = DEFAULT_TEXT_ALIGN_VALUE,
	onChange,
	columns,
	fieldProps = EMPTY_FIELD_PROPS,
	...props
}: TextAlignControlProps): MixedElement {
	const options = useMemo(
		() => optionsProp || getTextAlignSelectOptions(),
		[optionsProp]
	);

	const mergedFieldProps = useMemo(() => {
		if (fieldProps === EMPTY_FIELD_PROPS) {
			return DEFAULT_FIELD_PROPS;
		}

		return {
			'data-test': 'text-align-control',
			...fieldProps,
		};
	}, [fieldProps]);

	return (
		<ToggleSelectControl
			id={id}
			label={label}
			labelDescription={labelDescription}
			options={options}
			isDeselectable={true}
			defaultValue={defaultValue}
			onChange={onChange}
			columns={columns}
			fieldProps={mergedFieldProps}
			field="text-align"
			{...props}
		/>
	);
}
