// @flow
/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { __ } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import {
	ControlContextProvider,
	FontFamilyControl,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';

export const FontFamily = ({
	block,
	value,
	onChange,
	defaultValue,
	...props
}: {
	block: TBlockProps,
	value: string | void,
	defaultValue?: string,
	onChange: THandleOnChangeAttributes,
}): MixedElement => {
	return (
		<ControlContextProvider
			value={{
				name: generateExtensionId(block, 'font-family'),
				value,
				attribute: 'blockeraFontFamily',
				blockName: block.blockName,
			}}
		>
			<FontFamilyControl
				label={__('Font Family', 'blockera')}
				columns="columns-2"
				defaultValue={defaultValue}
				onChange={(newValue, ref) =>
					onChange('blockeraFontFamily', newValue, { ref })
				}
				{...props}
			/>
		</ControlContextProvider>
	);
};
