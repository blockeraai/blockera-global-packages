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

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';
import { areTypographyInputFieldPropsEqual } from './are-typography-input-field-props-equal';

function LetterSpacingComponent({
	block,
	value,
	onChange,
	defaultValue = '',
	activeSearchMode,
	...props
}: {
	block: TBlockProps,
	value: string | void,
	defaultValue?: string,
	onChange: THandleOnChangeAttributes,
	activeSearchMode: boolean,
}): MixedElement {
	const handleChange = useCallback(
		(newValue: Object, ref?: Object): void => {
			onChange('blockeraLetterSpacing', newValue, { ref });
		},
		[onChange]
	);

	return (
		<ControlContextProvider
			value={{
				name: generateExtensionId(block, 'letter-spacing'),
				value,
				attribute: 'blockeraLetterSpacing',
				blockName: block.blockName,
			}}
		>
			<InputControl
				columns={activeSearchMode ? '1fr 2.5fr' : '2fr 2fr'}
				label={
					activeSearchMode
						? __('Letters Spacing', 'blockera')
						: __('Letters', 'blockera')
				}
				labelPopoverTitle={__('Letters Spacing', 'blockera')}
				labelDescription={
					<>
						<p>
							{__(
								'It adjusts the space between characters in text, enhancing readability and visual appeal, especially useful in headings, logos, and graphic text.',
								'blockera'
							)}
						</p>
						<p>
							{__(
								'It is vital for typographic refinement, allowing control over text density and improving legibility, particularly in creative and web design contexts.',
								'blockera'
							)}
						</p>
					</>
				}
				defaultValue={defaultValue}
				arrows={true}
				unitType="letter-spacing"
				onChange={handleChange}
				{...props}
			/>
		</ControlContextProvider>
	);
}

export const LetterSpacing: ComponentType<any> = memo(
	LetterSpacingComponent,
	areTypographyInputFieldPropsEqual
);
