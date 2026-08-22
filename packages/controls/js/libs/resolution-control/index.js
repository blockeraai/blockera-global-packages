// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { MixedElement } from 'react';

/**
 * Internal dependencies
 */
import SelectControl from '../select-control';
import type { ResolutionControlProps } from './types';
import { mapImageSizesToResolutionOptions } from './utils';
import type { ImageSizeSetting } from './utils';
import { DEFAULT_RESOLUTION_VALUE } from './constants';

export type * from './types';
export * from './utils';
export {
	DEFAULT_RESOLUTION_OPTIONS,
	DEFAULT_RESOLUTION_VALUE,
} from './constants';

const EMPTY_FIELD_PROPS = {};
const DEFAULT_FIELD_PROPS = { 'data-test': 'resolution-select' };

export default function ResolutionControl({
	id,
	label = __('Resolution', 'blockera'),
	labelDescription = __('Select the size of the source image.', 'blockera'),
	options: optionsProp,
	defaultValue = DEFAULT_RESOLUTION_VALUE,
	onChange,
	columns,
	fieldProps = EMPTY_FIELD_PROPS,
	...props
}: ResolutionControlProps): MixedElement {
	const imageSizes = useSelect(
		(select): ?Array<ImageSizeSetting> => {
			if (optionsProp) {
				return undefined;
			}

			const settings = select(blockEditorStore)?.getSettings?.();
			const sizes = settings?.imageSizes;

			if (!Array.isArray(sizes)) {
				return undefined;
			}

			return sizes;
		},
		[optionsProp]
	);

	const options = useMemo(() => {
		if (optionsProp) {
			return optionsProp;
		}

		return mapImageSizesToResolutionOptions(imageSizes);
	}, [optionsProp, imageSizes]);

	const mergedFieldProps = useMemo(() => {
		if (fieldProps === EMPTY_FIELD_PROPS) {
			return DEFAULT_FIELD_PROPS;
		}

		return {
			'data-test': 'resolution-select',
			...fieldProps,
		};
	}, [fieldProps]);

	return (
		<SelectControl
			id={id}
			label={label}
			labelDescription={labelDescription}
			options={options}
			type="native"
			defaultValue={defaultValue}
			onChange={onChange}
			columns={columns}
			fieldProps={mergedFieldProps}
			{...props}
		/>
	);
}
