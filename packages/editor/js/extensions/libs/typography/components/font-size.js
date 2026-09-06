// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { memo, useCallback } from '@wordpress/element';
import type { MixedElement, ComponentType } from 'react';

/**
 * Blockera dependencies
 */
import { ControlContextProvider, InputControl } from '@blockera/controls';
import type { ControlSize } from '@blockera/controls/js/types/general-control-types';

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';
import { areTypographyInputFieldPropsEqual } from './are-typography-input-field-props-equal';

function FontSizeComponent({
	block,
	value,
	onChange,
	defaultValue,
	size,
	...props
}: {
	block: TBlockProps,
	value: string | void,
	defaultValue?: string,
	size?: ControlSize,
	onChange: THandleOnChangeAttributes,
}): MixedElement {
	const handleChange = useCallback(
		(newValue: mixed, ref: Object) => {
			onChange('blockeraFontSize', newValue, { ref });
		},
		[onChange]
	);

	return (
		<ControlContextProvider
			value={{
				name: generateExtensionId(block, 'font-size'),
				value,
				attribute: 'blockeraFontSize',
				blockName: block.blockName,
			}}
		>
			<InputControl
				label={__('Font Size', 'blockera')}
				labelDescription={
					<>
						<p>
							{__(
								'It sets the size of the font for text content, allowing customization of text appearance for readability and aesthetic appeal in various contexts.',
								'blockera'
							)}
						</p>
						<p>
							{__(
								'Relative units like "em" and "rem" are recommended for responsive designs as they adjust based on parent font size or root font size, respectively.',
								'blockera'
							)}
						</p>
					</>
				}
				columns="columns-2"
				unitType="essential"
				min={0}
				defaultValue={defaultValue}
				onChange={handleChange}
				controlAddonTypes={['variable']}
				variableTypes={['font-size']}
				size={size}
				{...props}
			/>
		</ControlContextProvider>
	);
}

export const FontSize: ComponentType<any> = memo(
	FontSizeComponent,
	areTypographyInputFieldPropsEqual
);
