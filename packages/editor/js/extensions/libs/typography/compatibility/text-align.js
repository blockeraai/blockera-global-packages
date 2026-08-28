// @flow

/**
 * Internal dependencies
 */
import { runInsideBlockInspector, getWpFromStyleOrGlobal } from '../../utils';

export function textAlignFromWPCompatibility({
	attributes,
	blockId,
	editorSelectedBlockEvent,
	insideBlockInspector = true,
}: {
	attributes: Object,
	blockId: string,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
	insideBlockInspector?: boolean,
}): Object {
	const textAlign =
		attributes?.style?.typography?.textAlign ?? attributes?.textAlign;

	// For detecting the text align changer from block editor controls
	// we have to validate and make sure the value is correct and should be updated
	if (
		textAlign !== undefined &&
		attributes?.blockeraTextAlign?.value !== textAlign
	) {
		if (textAlign !== undefined) {
			attributes.blockeraTextAlign = {
				value: textAlign,
			};
		}
	}

	return attributes;
}

export function textAlignToWPCompatibility({
	newValue,
	ref,
	blockId,
	editorSelectedBlockEvent,
	insideBlockInspector = true,
}: {
	newValue: Object,
	ref?: Object,
	blockId: string,
	insideBlockInspector?: boolean,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
}): Object {
	const insideInspector = runInsideBlockInspector(
		insideBlockInspector,
		editorSelectedBlockEvent
	);

	if (
		newValue === '' ||
		'reset' === ref?.current?.action ||
		['left', 'center', 'right'].indexOf(newValue) === -1
	) {
		return insideInspector
			? {
					align: undefined, // clear legacy align attribute
					style: {
						typography: {
							textAlign: undefined,
						},
					},
				}
			: {
					typography: {
						textAlign: undefined,
					},
				};
	}

	return insideInspector
		? {
				align: undefined, // clear legacy align attribute
				style: {
					typography: {
						textAlign: newValue,
					},
				},
			}
		: {
				typography: {
					textAlign: newValue,
				},
			};
}
