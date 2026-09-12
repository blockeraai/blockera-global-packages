// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { memo, useCallback } from '@wordpress/element';
import type { ComponentType, MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import {
	BaseControl,
	BackgroundControl,
	ControlContextProvider,
	type ControlContextRef,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';
import { areBackgroundFieldPropsEqual } from './are-background-field-props-equal';

type BackgroundLayersFieldProps = {
	block: TBlockProps,
	value: mixed,
	defaultValue: mixed,
	onChange: THandleOnChangeAttributes,
};

const BackgroundLayersFieldView = ({
	block,
	value,
	defaultValue,
	onChange,
}: BackgroundLayersFieldProps): MixedElement => {
	const handleChange = useCallback(
		(newValue: mixed, ref?: ControlContextRef): void => {
			onChange('blockeraBackground', newValue, { ref });
		},
		[onChange]
	);

	return (
		<ControlContextProvider
			value={{
				name: generateExtensionId(block, 'background'),
				value,
				attribute: 'blockeraBackground',
				blockName: block.blockName,
			}}
			storeName={'blockera/controls/repeater'}
		>
			<BaseControl controlName="background" columns="columns-1">
				<BackgroundControl
					label={__('Image & Gradient', 'blockera')}
					onChange={handleChange}
					defaultValue={defaultValue}
				/>
			</BaseControl>
		</ControlContextProvider>
	);
};

export const BackgroundLayersField: ComponentType<BackgroundLayersFieldProps> =
	memo(BackgroundLayersFieldView, areBackgroundFieldPropsEqual);
