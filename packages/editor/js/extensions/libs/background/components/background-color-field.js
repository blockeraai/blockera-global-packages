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
import { ColorControl, ControlContextProvider } from '@blockera/controls';

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';
import { areBackgroundFieldPropsEqual } from './are-background-field-props-equal';

const COLOR_VARIABLE_TYPES = ['color'];
const COLOR_CONTROL_ADDON_TYPES = ['variable'];

const BG_COLOR_LABEL_DESCRIPTION = (
	<>
		<p>
			{__(
				'It sets the color of the block’s background, providing a simple yet powerful way to apply solid color.',
				'blockera'
			)}
		</p>
		<p>
			{__(
				'You can use variables to use color from your site design system.',
				'blockera'
			)}
		</p>
	</>
);

const BackgroundColorFieldView = ({
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
			onChange('blockeraBackgroundColor', newValue, { ref });
		},
		[onChange]
	);

	return (
		<ControlContextProvider
			value={{
				name: generateExtensionId(block, 'background-color'),
				value,
				attribute: 'blockeraBackgroundColor',
				blockName: block.blockName,
			}}
		>
			<ColorControl
				label={__('BG Color', 'blockera')}
				labelPopoverTitle={__('Background Color', 'blockera')}
				labelDescription={BG_COLOR_LABEL_DESCRIPTION}
				columns="1fr 2.5fr"
				onChange={handleChange}
				defaultValue={defaultValue}
				controlAddonTypes={COLOR_CONTROL_ADDON_TYPES}
				variableTypes={COLOR_VARIABLE_TYPES}
			/>
		</ControlContextProvider>
	);
};

export const BackgroundColorField = memo(
	BackgroundColorFieldView,
	areBackgroundFieldPropsEqual
);
