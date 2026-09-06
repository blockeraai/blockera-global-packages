// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { memo, useCallback } from '@wordpress/element';
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import {
	BaseControl,
	BackgroundControl,
	ControlContextProvider,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';
import { areBackgroundFieldPropsEqual } from './are-background-field-props-equal';

const BackgroundLayersFieldView = ({
	block,
	value,
	defaultValue,
	onChange,
}: {
	block: TBlockProps,
	value: mixed,
	defaultValue: mixed,
	onChange: THandleOnChangeAttributes,
}): MixedElement => {
	const handleChange = useCallback(
		(newValue: mixed, ref: mixed) => {
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

export const BackgroundLayersField = memo(
	BackgroundLayersFieldView,
	areBackgroundFieldPropsEqual
);
