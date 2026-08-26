// @flow
/**
 * External dependencies
 */
import type { MixedElement, ComponentType } from 'react';

/**
 * Blockera dependencies
 */
import {
	AspectRatioControl,
	renderAspectRatioChangesetPreview,
	type AspectRatioValue,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import type { TBlockProps, THandleOnChangeAttributes } from '../../types';

export const AspectRatio: ComponentType<any> = ({
	block,
	ratio,
	handleOnChangeAttributes,
	defaultValue = {
		val: '',
		width: '',
		height: '',
	},
	...props
}: {
	block: TBlockProps,
	ratio: AspectRatioValue,
	defaultValue: AspectRatioValue,
	handleOnChangeAttributes: THandleOnChangeAttributes,
}): MixedElement => {
	return (
		<AspectRatioControl
			ratio={ratio}
			defaultValue={defaultValue}
			onChange={(newValue, ref) =>
				handleOnChangeAttributes('blockeraRatio', newValue, {
					ref,
				})
			}
			labelProps={{
				changesetGraphPreviewRender: renderAspectRatioChangesetPreview,
			}}
			{...props}
		/>
	);
};
