// @flow
/**
 * External dependencies
 */
import type { MixedElement } from 'react';

export type TIconStateAttributes = {
	blockeraIcon: Object,
	blockeraIconGap: string,
	blockeraIconSize?: string,
	blockeraIconLink: Object,
	blockeraIconColor: string,
	blockeraIconPosition: string,
	blockeraIconRotate: string,
	blockeraIconFlipHorizontal: string,
	blockeraIconFlipVertical: string,
	blockeraWidth?: string,
	[key: string]: any,
};

/**
 * Slot-fill props passed into feature extension components.
 * Kept local (optional fields) so icon extension typing stays practical.
 */
export type TExtensionFillComponentProps = {
	settings?: Object,
	slotName?: string,
	blockFeatures?: Object,
	handleOnChangeSettings?: (newSupports: Object, name: string) => void,
};

export type TIconProps = {
	block: Object,
	iconConfig: Object,
	children?: MixedElement,
	currentStateAttributes: TIconStateAttributes,
	attributes: Object,
	useBlockSection: (id: string) => Object,
	activeSearchMode?: boolean,
	handleOnChangeAttributes: (
		attributeId: string,
		newValue: any,
		options?: Object
	) => void,
	extensionProps: {
		blockeraIcon: Object,
		blockeraIconPosition: Object,
		blockeraIconGap: Object,
		blockeraIconSize: Object,
		blockeraIconColor: Object,
		blockeraIconLink: Object,
		blockeraIconRotate: Object,
		blockeraIconFlipHorizontal: Object,
		blockeraIconFlipVertical: Object,
	},
};
