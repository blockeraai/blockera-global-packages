// @flow
/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import {
	BaseControl,
	ControlContextProvider,
	InputControl,
	PositionButtonControl,
	useControlContext,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import { generateExtensionId } from '../../utils';
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';
import { normalizeTransformOriginForControl } from '../transform-origin-value';

export function ChildPerspective({
	block,
	handleOnChangeAttributes,
	transformChildOrigin,
	transformChildPerspectiveDefaultValue,
	transformChildOriginDefaultValue,
}: {
	block: TBlockProps,
	handleOnChangeAttributes: THandleOnChangeAttributes,
	transformChildOrigin: Object,
	transformChildPerspectiveDefaultValue: string,
	transformChildOriginDefaultValue: Object,
}): MixedElement {
	const { value, attribute, blockName, resetToDefault } = useControlContext({
		defaultValue: transformChildPerspectiveDefaultValue,
		onChange: (newValue, ref) =>
			handleOnChangeAttributes(
				'blockeraTransformChildPerspective',
				newValue,
				{ ref }
			),
	});

	const labelProps = {
		value,
		attribute,
		blockName,
		defaultValue: transformChildPerspectiveDefaultValue,
		resetToDefault,
		mode: 'advanced',
		path: attribute,
	};

	const originValue = useMemo(
		() => normalizeTransformOriginForControl(transformChildOrigin),
		[transformChildOrigin]
	);
	const originDefault = useMemo(
		() =>
			normalizeTransformOriginForControl(
				transformChildOriginDefaultValue
			),
		[transformChildOriginDefaultValue]
	);

	return (
		<>
			<BaseControl
				label={__('Child Perspective', 'blockera')}
				labelDescription={
					<>
						<p>
							{__(
								'It adds 3D effect by adding depth and distance for children blocks transformations, making elements appear to recede or come forward in 3D space.',
								'blockera'
							)}
						</p>
						<p>
							{__(
								'It enhances the realism of 3D transformations, making blocks like images, cards, and interactive graphics more dynamic and engaging.',
								'blockera'
							)}
						</p>
						<p>
							<b style={{ color: '#fff' }}>
								{__('Note:', 'blockera')}{' '}
							</b>
							{__(
								'This only applies to children blocks and does not affect this block. For applying to current block, use the "Self Perspective" setting.',
								'blockera'
							)}
						</p>
					</>
				}
				columns="1fr 130px"
				className={'blockera-transform-child-perspective'}
				{...labelProps}
			>
				<InputControl
					unitType={'essential'}
					min={0}
					max={2000}
					defaultValue={transformChildPerspectiveDefaultValue}
					onChange={(newValue, ref) =>
						handleOnChangeAttributes(
							'blockeraTransformChildPerspective',
							newValue,
							{ ref }
						)
					}
					size="small"
				/>

				<ControlContextProvider
					value={{
						name: generateExtensionId(block, 'child-origin'),
						value: originValue,
						attribute: 'blockeraTransformChildOrigin',
						blockName: block.blockName,
					}}
				>
					<PositionButtonControl
						buttonLabel={__('Child Perspective Origin', 'blockera')}
						popoverTitle={__(
							'Child Perspective Origin',
							'blockera'
						)}
						labelDescription={__(
							'Defines the perspective origin for nested content. Descendant blocks use this point as their 3D transform reference.',
							'blockera'
						)}
						alignmentMatrixLabel={__('Child Origin', 'blockera')}
						size="small"
						defaultValue={originDefault}
						onChange={({ top, left }, ref) => {
							handleOnChangeAttributes(
								'blockeraTransformChildOrigin',
								{
									top,
									left,
								},
								{ ref }
							);
						}}
					/>
				</ControlContextProvider>
			</BaseControl>
		</>
	);
}
