// @flow

/**
 * Internal dependencies
 */
import { runInsideBlockInspector, isEmptyBlockeraCompatValue, getWpFromStyleOrGlobal } from '../../utils';

export function fontFamilyFromWPCompatibility({
	attributes,
	insideBlockInspector = true,
	editorSelectedBlockEvent,
}: {
	attributes: Object,
	insideBlockInspector?: boolean,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
}): Object | false {
	const fontFamily = getWpFromStyleOrGlobal(
		attributes?.fontFamily,
		attributes?.typography?.fontFamily
	);

	if (
		isEmptyBlockeraCompatValue(attributes?.blockeraFontFamily?.value) &&
		fontFamily !== undefined
	) {
		attributes.blockeraFontFamily = {
			value: fontFamily,
		};
	}

	return attributes;
}

export function fontFamilyToWPCompatibility({
	newValue,
	ref,
	insideBlockInspector = true,
	editorSelectedBlockEvent,
}: {
	newValue: Object,
	ref?: Object,
	insideBlockInspector?: boolean,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
}): Object {
	if ('reset' === ref?.current?.action || newValue === '') {
		return runInsideBlockInspector(
			insideBlockInspector,
			editorSelectedBlockEvent
		)
			? {
					fontFamily: undefined,
				}
			: {
					typography: {
						fontFamily: undefined,
					},
				};
	}

	return runInsideBlockInspector(
		insideBlockInspector,
		editorSelectedBlockEvent
	)
		? {
				fontFamily: newValue,
			}
		: {
				typography: {
					fontFamily: newValue,
				},
			};
}
